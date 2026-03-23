import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

// Render LaTeX math to HTML using KaTeX
const renderMath = (math, displayMode = false) => {
  try {
    return katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      trust: true,
      strict: false
    })
  } catch (e) {
    console.warn('KaTeX error:', e)
    return `<span class="text-amber-400 font-mono text-sm">${math}</span>`
  }
}

// Enhanced markdown parser for AI responses with math support
// Optimized for dark mode with excellent contrast
export default function MarkdownRenderer({ content, className = '' }) {
  const htmlContent = useMemo(() => {
    if (!content) return ''
    
    let html = content
    
    // Store code blocks and math to prevent processing
    const codeBlocks = []
    const mathBlocks = []
    
    // Extract code blocks first
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const id = codeBlocks.length
      codeBlocks.push({ lang, code: code.trim() })
      return `__CODE_BLOCK_${id}__`
    })
    
    // Handle display math $$...$$ (block) - allow multiline and escaped chars
    html = html.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
      const id = mathBlocks.length
      mathBlocks.push({ math: math.trim(), display: true })
      return `__MATH_BLOCK_${id}__`
    })
    
    // Handle inline math $...$ - allow backslashes and special chars
    html = html.replace(/\$([^\$]+?)\$/g, (match, math) => {
      // Skip if it looks like currency (e.g., $100)
      if (/^\d+(\.\d+)?$/.test(math.trim())) {
        return match
      }
      const id = mathBlocks.length
      mathBlocks.push({ math: math.trim(), display: false })
      return `__MATH_BLOCK_${id}__`
    })
    
    // Escape HTML (after extracting math/code)
    html = html.replace(/&(?!#?\w+;)/g, '&amp;')
    html = html.replace(/<(?![/]?(?:span|div|svg|path|semantics|annotation|math|mrow|mi|mn|mo|mfrac|msup|msub|munder|mover|mspace|mtext|mstyle|mglyph|mpadded|mphantom|menclose|mfenced|mtable|mtr|mtd|maligngroup|malignmark|mscarries|mscarry|msline|msgroup|msrow|ms|mstack|mlongdiv|mlabeledtr|none|mprescripts|mmultiscripts)[^>]*>)/g, '&lt;')
    
    // Inline code (after escaping) - dark mode with cyan accent
    html = html.replace(/`([^`]+)`/g, '<code class="bg-primary-500/20 text-primary-300 px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
    
    // Headers - white text with size hierarchy
    html = html.replace(/^#### (.*$)/gm, '<h4 class="text-base font-semibold text-white mt-4 mb-2">$1</h4>')
    html = html.replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold text-white mt-5 mb-2">$1</h3>')
    html = html.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>')
    html = html.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-6 mb-3">$1</h1>')
    
    // Bold and italic - high contrast
    html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong class="font-bold text-white"><em>$1</em></strong>')
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em class="italic text-gray-100">$1</em>')
    
    // Lists - unordered - clear visibility
    html = html.replace(/^\* (.*$)/gm, '<li class="ml-5 list-disc text-gray-200 my-1.5 pl-1">$1</li>')
    html = html.replace(/^- (.*$)/gm, '<li class="ml-5 list-disc text-gray-200 my-1.5 pl-1">$1</li>')
    
    // Lists - ordered
    html = html.replace(/^\d+\. (.*$)/gm, '<li class="ml-5 list-decimal text-gray-200 my-1.5 pl-1">$1</li>')
    
    // Wrap consecutive list items
    html = html.replace(/(<li[^>]*>[\s\S]*?<\/li>\s*)+/g, (match) => {
      const isOrdered = match.includes('list-decimal')
      const tag = isOrdered ? 'ol' : 'ul'
      return `<${tag} class="my-3 space-y-1">${match}</${tag}>`
    })
    
    // Blockquotes - dark mode with accent border
    html = html.replace(/^&gt; (.*$)/gm, '<blockquote class="border-l-4 border-primary-500 pl-4 py-2 my-4 bg-primary-500/10 rounded-r-lg text-gray-200">$1</blockquote>')
    
    // Horizontal rule
    html = html.replace(/^---$/gm, '<hr class="my-6 border-white/10" />')
    
    // Links - primary color
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary-400 hover:text-primary-300 underline underline-offset-2" target="_blank" rel="noopener noreferrer">$1</a>')
    
    // Restore code blocks - dark theme with border
    codeBlocks.forEach(({ lang, code }, id) => {
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      html = html.replace(`__CODE_BLOCK_${id}__`, `<pre class="bg-[#0a0a12] text-gray-100 p-4 rounded-xl overflow-x-auto my-4 text-sm border border-white/5"><code>${escaped}</code></pre>`)
    })
    
    // Restore math blocks with rendered KaTeX
    mathBlocks.forEach(({ math, display }, id) => {
      const rendered = renderMath(math, display)
      if (display) {
        html = html.replace(`__MATH_BLOCK_${id}__`, `<div class="my-4 overflow-x-auto py-2">${rendered}</div>`)
      } else {
        html = html.replace(`__MATH_BLOCK_${id}__`, `<span class="inline-block align-middle">${rendered}</span>`)
      }
    })
    
    // Paragraphs - wrap remaining text blocks - good contrast
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
