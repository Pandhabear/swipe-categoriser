import React, { useState } from 'react'
import { useAppStore } from '../store.js'

const TRI_GREEN = '#004B32'
const TRI_BIRCH = '#F3EDE4'

// Triodos-aligned palette for categories
const PALETTE = [
  '#004B32', // Grounded Green
  '#8074FF', // Grounded Lupine
  '#FF6400', // Sienna Spark
  '#98D39A', // Principled Green
  '#DFFF57', // Energised Green
  '#3C132E', // Principled Lupine
  '#C2CBFA', // Energised Lupine
  '#222222', // Charcoal
  '#10b981', '#f59e0b', '#3b82f6', '#f43f5e',
]

function CategoryItem({ cat, onEdit, onDelete, dragHandlers }) {
  return (
    <div
      className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 border"
      style={{ borderColor: '#004B3215' }}
      draggable
      {...dragHandlers}
    >
      <span className="cursor-grab touch-none select-none text-lg" style={{ color: TRI_GREEN, opacity: 0.3 }}>⠿</span>
      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: cat.colour }} />
      <span className="flex-1 font-medium" style={{ color: '#222222' }}>{cat.name}</span>
      <button onClick={() => onEdit(cat)} className="px-1 transition-opacity hover:opacity-60" style={{ color: TRI_GREEN }}>✎</button>
      <button onClick={() => onDelete(cat.id)} className="px-1 transition-opacity hover:opacity-60 text-red-400">✕</button>
    </div>
  )
}

function CategoryForm({ initial, onSave, onCancel }) {
  const [name, setName] = useState(initial?.name || '')
  const [colour, setColour] = useState(initial?.colour || PALETTE[0])

  return (
    <div className="bg-white rounded-2xl p-4 space-y-3 border" style={{ borderColor: '#004B3215' }}>
      <input
        autoFocus
        placeholder="Category name"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && name.trim() && onSave(name.trim(), colour)}
        className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none"
        style={{ borderColor: '#004B3230', color: '#222222' }}
      />
      <div className="flex flex-wrap gap-2">
        {PALETTE.map(c => (
          <button
            key={c}
            onClick={() => setColour(c)}
            className="w-7 h-7 rounded-full transition-transform"
            style={{
              background: c,
              transform: colour === c ? 'scale(1.25)' : 'scale(1)',
              outline: colour === c ? `2px solid ${c}` : 'none',
              outlineOffset: '2px',
            }}
          />
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => name.trim() && onSave(name.trim(), colour)}
          disabled={!name.trim()}
          className="flex-1 text-white rounded-xl py-2.5 text-sm font-semibold disabled:opacity-40"
          style={{ background: TRI_GREEN }}
        >
          {initial ? 'Save' : 'Add Category'}
        </button>
        <button onClick={onCancel} className="px-4 text-sm" style={{ color: TRI_GREEN, opacity: 0.5 }}>Cancel</button>
      </div>
    </div>
  )
}

export default function CategoryManagement() {
  const navigate = useAppStore(s => s.navigate)
  const categories = useAppStore(s => s.categories)
  const addCategory = useAppStore(s => s.addCategory)
  const updateCategory = useAppStore(s => s.updateCategory)
  const deleteCategory = useAppStore(s => s.deleteCategory)
  const reorderCategories = useAppStore(s => s.reorderCategories)

  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  const handleDelete = (id) => {
    if (confirm('Delete this category?')) deleteCategory(id)
  }

  const handleDrop = (targetId) => {
    if (!dragId || dragId === targetId) return
    const ids = categories.map(c => c.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    const reordered = [...ids]
    reordered.splice(to, 0, reordered.splice(from, 1)[0])
    reorderCategories(reordered)
    setDragId(null)
    setDragOverId(null)
  }

  return (
    <div className="min-h-screen px-4 pt-12 pb-8" style={{ background: TRI_BIRCH }}>
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('home')} className="text-2xl leading-none" style={{ color: TRI_GREEN, opacity: 0.5 }}>←</button>
        <h1 className="text-xl font-bold" style={{ color: TRI_GREEN }}>Manage Categories</h1>
      </div>

      <div className="space-y-2 mb-4">
        {categories.length === 0 && !showAdd && (
          <p className="text-center text-sm py-8" style={{ color: TRI_GREEN, opacity: 0.4 }}>
            No categories yet. Add one below.
          </p>
        )}
        {categories.map(cat => (
          editing?.id === cat.id ? (
            <CategoryForm
              key={cat.id}
              initial={cat}
              onSave={(name, colour) => { updateCategory(cat.id, { name, colour }); setEditing(null) }}
              onCancel={() => setEditing(null)}
            />
          ) : (
            <CategoryItem
              key={cat.id}
              cat={cat}
              onEdit={setEditing}
              onDelete={handleDelete}
              dragHandlers={{
                onDragStart: () => setDragId(cat.id),
                onDragOver: (e) => { e.preventDefault(); setDragOverId(cat.id) },
                onDrop: () => handleDrop(cat.id),
                onDragEnd: () => { setDragId(null); setDragOverId(null) },
                style: dragOverId === cat.id ? { opacity: 0.5 } : {},
              }}
            />
          )
        ))}
      </div>

      {showAdd ? (
        <CategoryForm
          onSave={(name, colour) => { addCategory(name, colour); setShowAdd(false) }}
          onCancel={() => setShowAdd(false)}
        />
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="w-full border-2 border-dashed rounded-2xl py-4 text-sm font-semibold transition-colors"
          style={{ borderColor: '#004B3230', color: TRI_GREEN, opacity: 0.6 }}
        >
          + Add Category
        </button>
      )}
    </div>
  )
}
