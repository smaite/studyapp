import { useState, useEffect } from 'react'
import { X, Delete, Trash2 } from 'lucide-react'
import katex from 'katex'

// Simplified, intuitive math keyboard
const buttons = [
  // Row 1: Numbers
  ['7', '8', '9', '÷', '('],
  ['4', '5', '6', '×', ')'],
  ['1', '2', '3', '−', '^'],
  ['0', '.', '=', '+', '√'],
]

const extendedButtons = [
  // Variables & common
  ['x', 'y', 'z', 'n', 'π'],
  // Fractions & powers
  ['½', '⅓', '²', '³', 'ⁿ'],
  // Comparison
  ['<', '>', '≤', '≥', '≠'],
  // Functions
  ['sin', 'cos', 'tan', 'log', 'ln'],
]

const advancedButtons = [
  ['∫', 'Σ', 'lim', '∂', '∞'],
  ['dx', 'dy', 'd/dx', '∇', '±'],
]

export default function MathKeyboard({ onInsert, onClose, value = '' }) {
  const [mode, setMode] = useState('basic') // basic, extended, advanced
  const [preview, setPreview] = useState('')
  const [previewHtml, setPreviewHtml] = useState('')

  // Convert user-friendly input to LaTeX for preview
  useEffect(() => {
    try {
      let latex = value
        .replace(/÷/g, '\\div ')
        .replace(/×/g, '\\times ')
        .replace(/−/g, '-')
        .replace(/√\(([^)]+)\)/g, '\\sqrt{$1}')
        .replace(/√(\d+)/g, '\\sqrt{$1}')
        .replace(/√/g, '\\sqrt{}')
        .replace(/(\d+)\/(\d+)/g, '\\frac{$1}{$2}')
        .replace(/π/g, '\\pi ')
        .replace(/∞/g, '\\infty ')
        .replace(/≤/g, '\\leq ')
        .replace(/≥/g, '\\geq ')
        .replace(/≠/g, '\\neq ')
        .replace(/±/g, '\\pm ')
        .replace(/∫/g, '\\int ')
        .replace(/Σ/g, '\\sum ')
        .replace(/∂/g, '\\partial ')
        .replace(/∇/g, '\\nabla ')
        .replace(/²/g, '^2')
        .replace(/³/g, '^3')
        .replace(/ⁿ/g, '^n')
        .replace(/½/g, '\\frac{1}{2}')
        .replace(/⅓/g, '\\frac{1}{3}')
        .replace(/sin/g, '\\sin')
        .replace(/cos/g, '\\cos')
        .replace(/tan/g, '\\tan')
        .replace(/log/g, '\\log')
        .replace(/ln/g, '\\ln')
        .replace(/lim/g, '\\lim')
        .replace(/d\/dx/g, '\\frac{d}{dx}')
      
      const html = katex.renderToString(latex || '\\text{Type math here...}', {
        throwOnError: false,
        displayMode: false
      })
      setPreviewHtml(html)
    } catch (e) {
      setPreviewHtml('')
    }
  }, [value])

  const handleKey = (key) => {
    if (onInsert) {
      onInsert(key)
    }
  }

  const handleBackspace = () => {
    if (onInsert) {
      onInsert('BACKSPACE')
    }
  }

  const handleClear = () => {
    if (onInsert) {
      onInsert('CLEAR')
    }
  }

  const getButtonStyle = (key) => {
    // Numbers - orange/amber
    if (/^[0-9.]$/.test(key)) {
      return 'bg-amber-500 hover:bg-amber-400 text-gray-900 font-bold'
    }
    // Operators - darker
    if (['+', '−', '×', '÷', '=', '^'].includes(key)) {
      return 'bg-surface-600 hover:bg-surface-500 text-white'
    }
    // Functions & special
    return 'bg-surface-700 hover:bg-surface-600 text-gray-200'
  }

  const currentButtons = mode === 'basic' ? buttons : mode === 'extended' ? extendedButtons : advancedButtons

  return (
    <div className="bg-surface-900 border-t border-white/10 p-3 space-y-3">
      {/* Live Preview */}
      <div className="bg-surface-800 rounded-xl p-3 min-h-[50px] flex items-center justify-center border border-white/5">
        <div 
          className="text-xl text-white math-preview"
          dangerouslySetInnerHTML={{ __html: previewHtml || '<span class="text-gray-500 text-sm">Math preview</span>' }}
        />
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2">
        {[
          { id: 'basic', label: '123' },
          { id: 'extended', label: 'xyz' },
          { id: 'advanced', label: '∫∑' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setMode(id)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer ${
              mode === id
                ? 'bg-primary-600 text-white'
                : 'bg-surface-700 text-gray-400 hover:bg-surface-600'
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={onClose}
          className="px-4 py-2 bg-surface-700 hover:bg-surface-600 text-gray-400 rounded-xl transition-colors cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Keyboard grid */}
      <div className="space-y-1.5">
        {currentButtons.map((row, rowIdx) => (
          <div key={rowIdx} className="flex gap-1.5">
            {row.map((key, keyIdx) => (
              <button
                key={keyIdx}
                onClick={() => handleKey(key)}
                className={`flex-1 py-3.5 rounded-xl text-base transition-all active:scale-95 cursor-pointer ${getButtonStyle(key)}`}
              >
                {key}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Bottom row: Backspace & Clear */}
      <div className="flex gap-2">
        <button
          onClick={handleBackspace}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-colors active:scale-[0.98] cursor-pointer"
        >
          <Delete className="h-4 w-4" />
          Backspace
        </button>
        <button
          onClick={handleClear}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-surface-700 hover:bg-surface-600 text-gray-300 rounded-xl font-medium transition-colors active:scale-[0.98] cursor-pointer"
        >
          <Trash2 className="h-4 w-4" />
          Clear
        </button>
      </div>
    </div>
  )
}
