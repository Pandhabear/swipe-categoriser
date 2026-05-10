/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Triodos brand palette
        'tri-green':   '#004B32', // Grounded Green – primary
        'tri-lupine':  '#8074FF', // Grounded Lupine – secondary/accent
        'tri-birch':   '#F3EDE4', // Birch Skin – background
        'tri-charcoal':'#222222', // Charcoal – text
        'tri-sienna':  '#FF6400', // Sienna Spark – highlight/CTA
        'tri-sage':    '#98D39A', // Principled Green – muted/success
        'tri-lime':    '#DFFF57', // Energised Green – vibrant accent
        'tri-lavender':'#C2CBFA', // Energised Lupine – light bg
        'tri-plum':    '#3C132E', // Principled Lupine – deep dark
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
