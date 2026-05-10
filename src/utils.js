import Papa from 'papaparse'

const DATE_KEYS = ['date', 'transaction date', 'trans date', 'posted', 'booking date', 'value date']
const DESC_KEYS = ['description', 'merchant', 'name', 'payee', 'details', 'narrative', 'reference', 'memo', 'transaction']
const AMT_KEYS = ['amount', 'debit', 'credit', 'value', 'sum', 'transaction amount']
const CCY_KEYS = ['currency', 'ccy']

function matchCol(headers, patterns) {
  const lower = headers.map(h => h.toLowerCase().trim())
  for (const p of patterns) {
    const i = lower.findIndex(h => h.includes(p))
    if (i >= 0) return headers[i]
  }
  return null
}

export async function parseCSV(file, currency = '£') {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data, meta }) => {
        if (!data.length) { reject(new Error('No data found in file')); return }
        const headers = meta.fields || Object.keys(data[0])
        const dateCol = matchCol(headers, DATE_KEYS)
        const merchantCol = matchCol(headers, DESC_KEYS)
        const amountCol = matchCol(headers, AMT_KEYS)
        const currencyCol = matchCol(headers, CCY_KEYS)

        if (!merchantCol || !amountCol) {
          resolve({ needsMapping: true, headers, rawData: data, preview: data.slice(0, 5) })
          return
        }
        resolve({ transactions: mapRows(data, { dateCol, merchantCol, amountCol, currencyCol }, currency), columns: { dateCol, merchantCol, amountCol, currencyCol } })
      },
      error: (err) => reject(new Error(err.message)),
    })
  })
}

export function mapRows(data, { dateCol, merchantCol, amountCol, currencyCol }, currency = '£') {
  return data
    .map((row, i) => {
      const raw = String(row[amountCol] || '0')
      const amount = parseFloat(raw.replace(/[^0-9.-]/g, '')) || 0
      return {
        id: `t${i}`,
        date: row[dateCol] || '',
        merchant: (row[merchantCol] || 'Unknown').trim(),
        amount: Math.abs(amount),
        currency: row[currencyCol] || currency,
      }
    })
    .filter(t => t.amount > 0 || t.merchant !== 'Unknown')
}

export async function parsePDF(file, currency = '£') {
  const { getDocument, GlobalWorkerOptions } = await import('pdfjs-dist')
  GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href

  const buf = await file.arrayBuffer()
  const pdf = await getDocument({ data: buf }).promise
  const allRows = []

  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p)
    const content = await page.getTextContent()

    const items = content.items
      .filter(item => item.str && item.str.trim())
      .map(item => ({
        text: item.str.trim(),
        x: Math.round(item.transform[4] * 10) / 10,
        y: Math.round(item.transform[5] * 10) / 10,
        h: item.height > 0 ? item.height : (Math.abs(item.transform[3]) || 10),
      }))
    if (!items.length) continue

    // Compute a dynamic Y-tolerance from the median font height of this page.
    // Use a tighter multiplier (0.45) so visually distinct lines are not merged.
    const sortedH = items.map(i => i.h).sort((a, b) => a - b)
    const medH = sortedH[Math.floor(sortedH.length / 2)] || 10
    const tol = Math.max(2, medH * 0.45)

    // Cluster items into rows using a centroid-based approach:
    // each cluster tracks its own mean Y so it stays accurate as items are added.
    const clusters = []
    for (const item of items) {
      let best = null
      let bestDist = Infinity
      for (const c of clusters) {
        const dist = Math.abs(c.meanY - item.y)
        if (dist <= tol && dist < bestDist) { best = c; bestDist = dist }
      }
      if (best) {
        best.items.push(item)
        best.meanY = best.items.reduce((s, i) => s + i.y, 0) / best.items.length
      } else {
        clusters.push({ meanY: item.y, items: [item] })
      }
    }

    // Sort clusters top-to-bottom (PDF Y origin is bottom-left → descending meanY = visual top first)
    const rows = clusters
      .sort((a, b) => b.meanY - a.meanY)
      .map(c => c.items.sort((a, b) => a.x - b.x).map(i => i.text))

    allRows.push(...rows)
  }

  const transactions = extractTransactionsFromRows(allRows, currency)

  if (!transactions.length) {
    // Attach a sample of raw extracted rows so Upload.jsx can show the user what we saw
    const sample = allRows
      .filter(r => r.length >= 1)
      .slice(0, 20)
      .map(r => r.join('  '))
    const err = new Error('No transaction rows found in this PDF.')
    err.rawSample = sample
    throw err
  }

  return { transactions, lowConfidence: transactions.length < 3 }
}

// ── Date helpers ────────────────────────────────────────────────────────────

const MONTH_RE = 'Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?'

const DATE_PATTERNS = [
  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, DD/MM/YY  etc.
  /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
  // YYYY-MM-DD (ISO)
  /^\d{4}-\d{2}-\d{2}$/,
  // DD MMM YYYY  or  DD MMM YY  (any month spelling/abbreviation)
  new RegExp(`^\\d{1,2}\\s+(?:${MONTH_RE})\\s+\\d{2,4}$`, 'i'),
  // DD/MM  or  DD-MM  (no year)
  /^\d{1,2}[\/\-]\d{1,2}$/,
]

function isDate(str) {
  str = str.trim()
  return DATE_PATTERNS.some(re => re.test(str))
}

// Try to find a date in the first few tokens (including multi-token dates).
// Returns { dateStr, endIdx } or null.
function findDate(tokens) {
  for (let i = 0; i < Math.min(6, tokens.length); i++) {
    if (isDate(tokens[i])) return { dateStr: tokens[i], endIdx: i }
    if (i + 1 < tokens.length) {
      const t2 = `${tokens[i]} ${tokens[i + 1]}`
      if (isDate(t2)) return { dateStr: t2, endIdx: i + 1 }
    }
    if (i + 2 < tokens.length) {
      const t3 = `${tokens[i]} ${tokens[i + 1]} ${tokens[i + 2]}`
      if (isDate(t3)) return { dateStr: t3, endIdx: i + 2 }
    }
  }
  return null
}

// ── Amount helpers ───────────────────────────────────────────────────────────

function isAmount(str) {
  // Strip currency symbol and optional parentheses wrapper
  const s = str.replace(/^[£$€\s]+/, '').replace(/^\((.+)\)$/, '$1').trim()
  if (s.length === 0 || s.length > 14) return false
  return (
    /^-?\d{1,3}(,\d{3})*\.\d{2}$/.test(s) ||   // 1,234.56
    /^-?\d+\.\d{2}$/.test(s) ||                  // 1234.56
    /^-?\d{1,3}(\.\d{3})*,\d{2}$/.test(s) ||    // European: 1.234,56
    /^-?\d{1,3}(,\d{3})+$/.test(s) ||            // 1,234  (no decimals, thousands sep)
    /^-?\d{1,6}$/.test(s)                         // plain integer up to 999999
  )
}

function parseAmount(str) {
  const neg = /^\(.*\)$/.test(str.trim()) || str.trim().startsWith('-')
  // Detect European format (thousands dot, decimal comma): 1.234,56
  const isEU = /\d\.\d{3},\d{2}$/.test(str)
  let clean = str.replace(/[£$€()\s]/g, '').replace(/^-/, '')
  if (isEU) clean = clean.replace(/\./g, '').replace(',', '.')
  else clean = clean.replace(/,/g, '')
  const val = parseFloat(clean)
  return neg ? -Math.abs(val) : Math.abs(val)
}

// ── Transaction extraction ───────────────────────────────────────────────────

// Tokens that are clearly not part of a merchant name (headers, labels, etc.)
const NOISE_TOKENS = new Set([
  'date', 'description', 'merchant', 'amount', 'balance', 'debit', 'credit',
  'details', 'transaction', 'reference', 'dr', 'cr', 'paid out', 'paid in',
  'money out', 'money in', 'withdrawals', 'deposits', 'value', 'narrative',
])

function isNoise(tok) {
  return NOISE_TOKENS.has(tok.toLowerCase().trim())
}

// Detect if a row looks like a header row (majority of tokens are known header words)
function isHeaderRow(tokens) {
  const lower = tokens.map(t => t.toLowerCase().trim())
  const hits = lower.filter(t => NOISE_TOKENS.has(t)).length
  return hits >= 2 && hits >= tokens.length * 0.4
}

function extractTransactionsFromRows(rows, currency = '£') {
  const results = []
  let id = 0

  // First pass: identify which rows start a transaction (have a date).
  // We'll merge subsequent non-date rows into the preceding transaction row
  // to handle multi-line descriptions.
  const merged = []
  let current = null

  for (const tokens of rows) {
    if (!tokens.length) continue
    if (isHeaderRow(tokens)) { current = null; continue }

    const dateResult = findDate(tokens)
    if (dateResult) {
      // New transaction row — save previous and start fresh
      if (current) merged.push(current)
      current = { tokens: [...tokens], dateResult }
    } else if (current) {
      // Continuation row: if it contains an amount it's likely a separate entry —
      // only merge if there's no amount (pure description continuation)
      const hasAmt = tokens.some(t => isAmount(t))
      if (!hasAmt) {
        // Append description tokens to the current row's tokens (before any amounts)
        const firstAmtIdxCur = current.tokens.findIndex((t, i) => i > current.dateResult.endIdx && isAmount(t))
        const insertAt = firstAmtIdxCur >= 0 ? firstAmtIdxCur : current.tokens.length
        current.tokens.splice(insertAt, 0, ...tokens.filter(t => !isNoise(t) && t.trim().length > 0))
      } else {
        // Has amounts — treat as independent row, try to parse on its own
        merged.push({ tokens, dateResult: null })
      }
    } else {
      // No current transaction context yet, stash as-is for second pass
      merged.push({ tokens, dateResult: null })
    }
  }
  if (current) merged.push(current)

  // Second pass: extract transactions from merged rows
  for (const { tokens, dateResult: dr } of merged) {
    // Re-detect date if we lost it during merging (shouldn't normally happen)
    const dateResult = dr || findDate(tokens)
    if (!dateResult && tokens.length < 2) continue

    const startIdx = dateResult ? dateResult.endIdx + 1 : 0
    const dateStr = dateResult ? dateResult.dateStr : ''

    // Collect all amount-positions after the date
    const amounts = []
    for (let i = startIdx; i < tokens.length; i++) {
      if (isAmount(tokens[i])) amounts.push({ i, v: parseAmount(tokens[i]) })
    }
    if (!amounts.length) continue

    // Pick the transaction amount.
    // Strategy: prefer the SMALLEST non-zero amount (transaction value is usually
    // less than a running balance). If only one amount, use it directly.
    // Also handle: debit/credit split columns — use first non-zero.
    let txAmount
    if (amounts.length === 1) {
      txAmount = amounts[0].v
    } else if (amounts.length === 2) {
      // Two amounts: could be (debit | credit) or (amount | balance).
      // Use whichever is non-zero first; if both non-zero, use the smaller one.
      const [a, b] = amounts
      if (a.v < 0.01) txAmount = b.v
      else if (b.v < 0.01) txAmount = a.v
      else txAmount = Math.min(a.v, b.v)
    } else {
      // 3+ amounts: drop the largest (most likely running balance) and use smallest remaining
      const sorted = [...amounts].sort((a, b) => a.v - b.v)
      const nonZero = sorted.filter(a => a.v >= 0.01)
      txAmount = nonZero.length ? nonZero[0].v : amounts[0].v
    }

    if (!isFinite(txAmount) || txAmount < 0.01) continue

    // Merchant = tokens between end of date and first amount, excluding amounts and noise
    const firstAmtIdx = amounts[0].i
    const merchant = tokens
      .slice(startIdx, firstAmtIdx)
      .filter(t => !isAmount(t) && !isNoise(t) && t.trim().length > 0)
      .join(' ')
      .trim()

    // If no merchant found between date and first amount, look after all amounts
    // (some PDFs put description at the end)
    const fallbackMerchant = !merchant
      ? tokens
          .slice(amounts[amounts.length - 1].i + 1)
          .filter(t => !isAmount(t) && !isNoise(t) && t.trim().length > 0)
          .join(' ')
          .trim()
      : ''

    const finalMerchant = merchant || fallbackMerchant
    if (!finalMerchant) continue

    results.push({ id: `t${id++}`, date: dateStr, merchant: finalMerchant, amount: txAmount, currency })
  }

  return results
}

export function fmt(amount, currency = '£') {
  return `${currency}${parseFloat(amount).toFixed(2)}`
}

export function getCategoryName(id, categories) {
  if (id === 'uncategorized') return 'Uncategorized'
  if (id === 'review_later') return 'Review Later'
  return categories.find(c => c.id === id)?.name || 'Unknown'
}

export function buildCategoryStats(session, categories) {
  const stats = {}
  const allIds = [...session.selectedCategoryIds, 'uncategorized', 'review_later']
  for (const id of allIds) {
    stats[id] = { id, name: getCategoryName(id, categories), count: 0, total: 0, transactions: [] }
  }
  for (const t of session.transactions) {
    const id = t.assignedCategory || 'uncategorized'
    if (!stats[id]) stats[id] = { id, name: getCategoryName(id, categories), count: 0, total: 0, transactions: [] }
    stats[id].count++
    stats[id].total += t.amount
    stats[id].transactions.push(t)
  }
  return Object.values(stats).filter(s => s.count > 0)
}

export function exportCSV(session, categories) {
  const rows = [['Category', 'Date', 'Merchant', 'Amount', 'Currency']]
  const sorted = [...session.transactions].sort((a, b) =>
    getCategoryName(a.assignedCategory, categories).localeCompare(getCategoryName(b.assignedCategory, categories))
  )
  for (const t of sorted) {
    rows.push([getCategoryName(t.assignedCategory, categories), t.date, t.merchant, t.amount.toFixed(2), t.currency || '£'])
  }
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `transactions-${new Date(session.createdAt).toISOString().slice(0, 7)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportPDF(session, categories) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const doc = new jsPDF()
  const d = new Date(session.createdAt)
  const month = d.toLocaleString('default', { month: 'long', year: 'numeric' })

  doc.setFontSize(22)
  doc.setTextColor(99, 102, 241)
  doc.text('Transaction Summary', 14, 22)
  doc.setFontSize(11)
  doc.setTextColor(100, 116, 139)
  doc.text(`${month} · ${session.fileName}`, 14, 30)

  const stats = buildCategoryStats(session, categories)
  const totalAmt = stats.reduce((s, c) => s + c.total, 0)

  const exportCurrency = session.transactions?.[0]?.currency || '£'
  autoTable(doc, {
    startY: 36,
    head: [['Category', 'Transactions', 'Total', '%']],
    body: stats.map(s => [s.name, s.count, `${exportCurrency}${s.total.toFixed(2)}`, `${totalAmt ? ((s.total / totalAmt) * 100).toFixed(1) : 0}%`]),
    theme: 'striped',
    headStyles: { fillColor: [99, 102, 241] },
  })

  let y = doc.lastAutoTable.finalY + 12
  for (const cat of stats) {
    if (y > 250) { doc.addPage(); y = 16 }
    doc.setFontSize(12)
    doc.setTextColor(30, 41, 59)
    doc.text(cat.name, 14, y)
    autoTable(doc, {
      startY: y + 4,
      head: [['Date', 'Merchant', 'Amount']],
      body: cat.transactions.map(t => [t.date, t.merchant, `${t.currency || '£'}${t.amount.toFixed(2)}`]),
      theme: 'striped',
      headStyles: { fillColor: [148, 163, 184] },
      styles: { fontSize: 9 },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  doc.save(`transactions-${d.toISOString().slice(0, 7)}.pdf`)
}
