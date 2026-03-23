import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Render LaTeX math to HTML using KaTeX
const renderMath = (math, displayMode = false) => {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      trust: true
    })
  } catch (e) {
    return `<span class="text-red-400">${math}</span>`
  }
}

// Enhanced markdown parser for AI responses with math support
// Supports dark mode by default
export default function MarkdownRenderer({ content, className = '' }) {
  const htmlContent = useMemo(() => {
    if (!content) return ''
    
    let html = content
    
    // Store code blocks to prevent processing
    const codeBlocks = []
    
    // Extract code blocks first
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const id = codeBlocks.length
      codeBlocks.push({ lang, code: code.trim() })
      return `__CODE_BLOCK_${id}__`
    })
    
    // Handle display math $$...$$ (block)
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      return `<div class="my-4 overflow-x-auto text-gray-100">${renderMath(math.trim(), true)}</div>`
    })
    
    // Handle inline math $...$ 
    html = html.replace(/\$([^$\n]+)\$/g, (match, math) => {
      return `<span class="text-gray-100">${renderMath(math.trim(), false)}</span>`
    })
    
    // Escape HTML (after math processing)
    html = html.replace(/&(?!#?\w+;)/g, '&amp;')
    html = html.replace(/<(?![/]?(?:span|div|svg|path|semantics|annotation|math|mrow|mi|mn|mo|mfrac|msup|msub|munder|mover|mspace|mtext|mstyle|mglyph|mpadded|mphantom|menclose|mfenced|mtable|mtr|mtd|maligngroup|malignmark|mscarries|mscarry|msline|msgroup|msrow|ms|mstack|mlongdiv|mlabeledtr|none|mprescripts|mmultiscripts)[^>]*>)/g, '&lt;')
    
    // Inline code (after escaping) - dark mode
    html = html.replace(/`([^`]+)`/g, '<code class="bg-gray-700 text-primary-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Headers - white text for dark mode
    html = html.replace(/^#### (.*$)/gm, '<h4 class="text-base font-bold text-white mt-5 mb-2">$1</h4>')
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-white mt-5 mb-2">$1</h3>')
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-3">$1</h1>')
    
    // Bold and italic - light text
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-semibold text-white"><em>$1</em></strong>')
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-gray-200">$1</em>')
    
    // Lists - unordered - light gray text
    html = html.replace(/^\* (.*$)/gm, '<li class="ml-5 list-disc text-gray-200 my-1 pl-1">$1</li>')
    html = html.replace(/^- (.*$)/gm, '<li class="ml-5 list-disc text-gray-200 my-1 pl-1">$1</li>')
    
    // Lists - ordered
    html = html.replace(/^\d+\. (.*$)/gm, '<li class="ml-5 list-decimal text-gray-200 my-1 pl-1">$1</li>')
    
    // Wrap consecutive list items
    html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\s*)+/g, (match) => {
      const isOrdered = match.includes('list-decimal')
      const tag = isOrdered ? 'ol' : 'ul'
      return `<${tag} class="my-3 space-y-1">${match}</${tag}>`
    })
    
    // Blockquotes - dark mode
    html = html.replace(/^&gt; (.*$)/gm, '<blockquote class="border-l-4 border-primary-500 pl-4 py-2 my-4 bg-gray-800/50 rounded-r-lg text-gray-300 italic">$1</blockquote>')
    
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr class="my-6 border-gray-700" />')
    
    // Links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-400 hover:text-primary-300 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Restore code blocks - dark theme
    codeBlocks.forEach(({ lang, code }, id) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      html = html.replace(`__CODE_BLOCK_${id}__`, `<pre class="bg-gray-950 text-gray-100 p-4 rounded-xl overflow-x-auto my-4 text-sm border border-gray-800"><code>${escaped}</code></pre>`)
    })
    
    // Paragraphs - wrap remaining text blocks - light gray for readability
    html = html.split('\n\n').map(block => {
      if (!block.trim()) return ''
      // Don't wrap if already has block-level HTML
      if (block.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr|div)/)) {
        return block
      }
      return `<p class="text-gray-200 leading-relaxed my-2">${block}</p>`
    }).join('')
    
    // Single line breaks within paragraphs
    html = html.replace(/([^>])\n([^<])/g, '$1<br />$2')
    
    return html
  }, [content])

  return (
    <div 
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}
