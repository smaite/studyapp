import { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const mathCategories = {
  basic: {
    label: '+ −\n× ÷',
    symbols: ['+', '−', '×', '÷', '=', '≠', '±', '%']
  },
  functions: {
    label: 'f(x) e\nlog ln',
    symbols: ['f(x)', 'e', 'log', 'ln', 'π', '|x|', '!', '∞']
  },
  trig: {
    label: 'sin cos\ntan cot',
    symbols: ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos']
  },
  calculus: {
    label: 'lim dx\n∫ Σ ∞',
    symbols: ['lim', 'dx', '∫', 'Σ', '∂', '∇', 'd/dx', '∏']
  }
}

const numberKeys = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
const variableKeys = ['x', 'y', '√', '∛', '^2', '^n', '(', ')', '÷', '<']
const operatorKeys = ['>', '×', '≤', '≥', '−', 'frac', '≠', ',', '=', '+']

export default function MathKeyboard({ onInsert, onClose }) {
  const [activeCategory, setActiveCategory] = useState('basic')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [expression, setExpression] = useState('')

  const handleKeyPress = (key) => {
    let insertText = key
    
    // Convert display symbols to LaTeX
    const latexMap = {
      '√': '\\sqrt{',
      '∛': '\\sqrt[3]{',
      '^2': '^{2}',
      '^n': '^{}',
      'frac': '\\frac{}{}',
      '×': '\\times ',
      '÷': '\\div ',
      '≤': '\\leq ',
      '≥': '\\geq ',
      '≠': '\\neq ',
      '±': '\\pm ',
      'π': '\\pi ',
      '∞': '\\infty ',
      '∫': '\\int ',
      'Σ': '\\sum ',
      '∂': '\\partial ',
      '∇': '\\nabla ',
      '∏': '\\prod ',
      'sin': '\\sin(',
      'cos': '\\cos(',
      'tan': '\\tan(',
      'cot': '\\cot(',
      'sec': '\\sec(',
      'csc': '\\csc(',
      'arcsin': '\\arcsin(',
      'arccos': '\\arccos(',
      'log': '\\log(',
      'ln': '\\ln(',
      'lim': '\\lim_{} ',
      'd/dx': '\\frac{d}{dx}',
      '|x|': '|',
      'f(x)': 'f(x) = ',
      'e': 'e',
      '−': '-',
      '!': '!'
    }
    
    insertText = latexMap[key] || key
    
    if (onInsert) {
      onInsert(insertText)
    }
    
    setExpression(prev => prev + insertText)
  }

  const handleBackspace = () => {
    setExpression(prev => prev.slice(0, -1))
    if (onInsert) {
      onInsert('BACKSPACE')
    }
  }

  const handleClear = () => {
    setExpression('')
    if (onInsert) {
      onInsert('CLEAR')
    }
  }

  return (
    <div className="bg-gray-900 border-t border-gray-800 p-3">
      {/* Category tabs */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex gap-2">
          {Object.entries(mathCategories).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-3 py-2 rounded-lg text-xs whitespace-pre-line text-center transition-colors ${
                activeCategory === key
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-gray-400 hover:text-white">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button className="p-2 text-gray-400 hover:text-white">
            <ChevronRight className="h-4 w-4" />
          </button>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm flex items-center gap-1"
          >
            Close keyboard <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Symbol row for active category */}
      <div className="flex gap-1 mb-2">
        {mathCategories[activeCategory].symbols.map((sym, i) => (
          <button
            key={i}
            onClick={() => handleKeyPress(sym)}
            className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-200 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Number row */}
      <div className="flex gap-1 mb-1">
        {numberKeys.map((key) => (
          <button
            key={key}
            onClick={() => handleKeyPress(key)}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-gray-900 py-3 rounded-lg text-lg font-bold transition-colors"
          >
            {key}
          </button>
        ))}
      </div>

      {/* Variable row */}
      <div className="flex gap-1 mb-1">
        {variableKeys.map((key, i) => (
          <button
            key={i}
            onClick={() => handleKeyPress(key)}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              ['√', '∛', '^2', '^n'].includes(key)
                ? 'bg-amber-500 hover:bg-amber-400 text-gray-900'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }`}
          >
            {key === '^2' ? 'a²' : key === '^n' ? 'xⁿ' : key}
          </button>
        ))}
      </div>

      {/* Operator row */}
      <div className="flex gap-1">
        {operatorKeys.map((key, i) => (
          <button
            key={i}
            onClick={() => handleKeyPress(key)}
            className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
              key === 'frac'
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200'
            }`}
          >
            {key === 'frac' ? 'x/y' : key}
          </button>
        ))}
      </div>

      {/* Backspace and clear */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={handleBackspace}
          className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          ⌫ Backspace
        </button>
        <button
          onClick={handleClear}
          className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Clear
        </button>
      </div>
    </div>
  )
}
