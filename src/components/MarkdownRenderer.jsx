import { useMemo, useRef, useEffect, useState } from 'react'
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

// Pie chart component for inline data visualization
function PieChart({ data, title }) {
  if (!data || !Array.isArray(data) || data.length === 0) return null
  
  const total = data.reduce((sum, item) => sum + (item.value || 0), 0)
  if (total === 0) return null
  
  const colors = [
    '#a855f7', '#22d3ee', '#f472b6', '#4ade80', '#facc15', 
    '#fb923c', '#60a5fa', '#c084fc', '#34d399', '#f87171'
  ]
  
  let currentAngle = 0
  const slices = data.map((item, i) => {
    const percentage = (item.value / total) * 100
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    currentAngle = endAngle
    
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    const largeArc = angle > 180 ? 1 : 0
    
    const x1 = 50 + 40 * Math.cos(startRad)
    const y1 = 50 + 40 * Math.sin(startRad)
    const x2 = 50 + 40 * Math.cos(endRad)
    const y2 = 50 + 40 * Math.sin(endRad)
    
    const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
    
    return { path, color: colors[i % colors.length], label: item.label || `Item ${i + 1}`, value: item.value, percentage: percentage.toFixed(1) }
  })
  
  return (
    <div className="my-4 p-4 bg-surface-800/60 rounded-xl border border-white/10">
      {title && <h4 className="text-white font-medium mb-3 text-center">{title}</h4>}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <svg viewBox="0 0 100 100" className="w-40 h-40 md:w-48 md:h-48">
          {slices.map((slice, i) => (
            <path key={i} d={slice.path} fill={slice.color} stroke="#0f0f1a" strokeWidth="0.5" className="hover:opacity-80 transition-opacity cursor-pointer">
              <title>{slice.label}: {slice.value} ({slice.percentage}%)</title>
            </path>
          ))}
        </svg>
        <div className="flex flex-col gap-1.5">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: slice.color }} />
              <span className="text-gray-300">{slice.label}</span>
              <span className="text-gray-500">({slice.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Safe HTML iframe renderer with Tailwind CSS support - uses srcdoc to avoid cross-origin issues
function SafeHtmlFrame({ html }) {
  const [height, setHeight] = useState(200)
  const frameId = useRef(`frame-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  
  // Build srcdoc content - professional dark theme optimized for mobile
  const srcdoc = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { 
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          padding: 16px;
          background: #0d0d15;
          color: #d1d5db;
          font-size: 15px;
          line-height: 1.65;
          -webkit-font-smoothing: antialiased;
        }
        /* Document wrapper - clean dark theme */
        .letter, .document, .card, .application, .formal-letter {
          background: #111118;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          padding: 20px;
        }
        @media (min-width: 480px) {
          .letter, .document, .card, .application, .formal-letter {
            padding: 28px;
          }
        }
        .letter-header, .document-header {
          border-bottom: 1px solid rgba(255,255,255,0.06);
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .letter-footer, .document-footer {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 12px;
          margin-top: 16px;
        }
        /* Typography - readable on mobile */
        h1 { color: #f3f4f6; font-size: 1.35em; font-weight: 600; margin-bottom: 14px; }
        h2 { color: #e5e7eb; font-size: 1.15em; font-weight: 600; margin-bottom: 12px; }
        h3, h4 { color: #d1d5db; font-size: 1.05em; font-weight: 500; margin-bottom: 10px; }
        p { 
          color: #b8bcc5; 
          line-height: 1.7; 
          margin: 10px 0; 
          text-align: left !important;
          word-spacing: normal !important;
        }
        a { color: #818cf8; text-decoration: none; }
        /* Document elements */
        .signature { font-style: italic; margin-top: 20px; color: #9ca3af; }
        .date { color: #9ca3af; font-size: 0.9em; margin-bottom: 14px; }
        .subject { font-weight: 600; color: #e5e7eb; margin: 12px 0; }
        .to, .from, .address { color: #9ca3af; margin: 3px 0; font-size: 0.95em; }
        /* Table - mobile friendly */
        table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 0.9em; }
        th, td { padding: 8px 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); color: #b8bcc5; }
        th { background: rgba(255,255,255,0.03); color: #d1d5db; font-weight: 500; }
        /* Lists */
        ul, ol { padding-left: 18px; color: #b8bcc5; margin: 10px 0; }
        li { margin: 5px 0; }
        /* Strong text */
        strong, b { color: #e5e7eb; font-weight: 600; }
        /* Spacing helpers */
        br { display: block; content: ""; margin-top: 8px; }
      </style>
    </head>
    <body>
      ${html}
      <script>
        const frameId = '${frameId.current}';
        function sendHeight() {
          const h = Math.max(document.body.scrollHeight, document.body.offsetHeight);
          window.parent.postMessage({ type: 'iframe-resize', frameId, height: h + 24 }, '*');
        }
        sendHeight();
        setTimeout(sendHeight, 50);
        setTimeout(sendHeight, 150);
        setTimeout(sendHeight, 400);
        if (typeof ResizeObserver !== 'undefined') {
          new ResizeObserver(sendHeight).observe(document.body);
        }
      <\/script>
    </body>
    </html>
  `, [html])
  
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'iframe-resize' && e.data.frameId === frameId.current && e.data.height) {
        setHeight(Math.min(800, Math.max(100, e.data.height)))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  return (
    <iframe
      srcDoc={srcdoc}
      className="w-full border-0 rounded-xl bg-surface-800/40"
      style={{ height: `${height}px` }}
      sandbox="allow-scripts"
      title="HTML Preview"
    />
  )
}

// Enhanced markdown parser for AI responses with math support
// Optimized for dark mode with excellent contrast
export default function MarkdownRenderer({ content, className = '' }) {
  const htmlContent = useMemo(() => {
    if (!content) return ''
    
    let html = content
    
    // Store code blocks, math, and SVG to prevent processing
    const codeBlocks = []
    const mathBlocks = []
    const svgBlocks = []
    
    // Extract SVG blocks first to protect them
    html = html.replace(/<svg[\s\S]*?<\/svg>/gi, (match) => {
      const id = svgBlocks.length
      svgBlocks.push(match)
      return `__SVG_BLOCK_${id}__`
    })
    
    // Extract code blocks
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
    
    // Escape HTML (after extracting math/code/svg)
    html = html.replace(/&(?!#?\w+;)/g, '&amp;')
    html = html.replace(/<(?![/]?(?:span|div|svg|path|circle|rect|line|polygon|polyline|ellipse|g|defs|use|symbol|clipPath|mask|pattern|linearGradient|radialGradient|stop|text|tspan|semantics|annotation|math|mrow|mi|mn|mo|mfrac|msup|msub|munder|mover|mspace|mtext|mstyle|mglyph|mpadded|mphantom|menclose|mfenced|mtable|mtr|mtd|maligngroup|malignmark|mscarries|mscarry|msline|msgroup|msrow|ms|mstack|mlongdiv|mlabeledtr|none|mprescripts|mmultiscripts)[^>]*>)/g, '&lt;')
    
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
      // Don't wrap if already has block-level HTML or placeholder
      if (block.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr|div)/) || block.includes('__SVG_BLOCK_')) {
        return block
      }
      return `<p class="text-gray-200 leading-relaxed my-2">${block}</p>`
    }).join('')
    
    // Single line breaks within paragraphs (but not around placeholders)
    html = html.replace(/([^>_])\n([^<_])/g, '$1<br />$2')
    
    // Restore SVG blocks last (after all text processing)
    svgBlocks.forEach((svg, id) => {
      html = html.replace(`__SVG_BLOCK_${id}__`, svg)
    })
    
    return html
  }, [content])

  return (
    <div 
      className={`markdown-content ${className}`}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  )
}

// Smart Content Renderer - handles HTML previews, pie charts, and markdown inline
// Detects special blocks and renders them appropriately while keeping text in markdown
export function SmartContentRenderer({ content, className = '' }) {
  const parts = useMemo(() => {
    if (!content) return []
    
    const result = []
    let remaining = content
    
    // Patterns for special blocks that should be rendered as previews
    // ```html-preview ... ``` - explicit HTML preview block
    // [[html]] ... [[/html]] - alternative HTML block syntax
    // [[pie:title|label:value|...]] - pie chart
    const patterns = [
      { 
        regex: /```html-preview\n([\s\S]*?)```/g, 
        type: 'html',
        extract: (m) => m[1].trim()
      },
      { 
        regex: /\[\[html\]\]([\s\S]*?)\[\[\/html\]\]/g, 
        type: 'html',
        extract: (m) => m[1].trim()
      },
      {
        regex: /\[\[pie:([^|]*)\|(.*?)\]\]/gs,
        type: 'pie',
        extract: (m) => {
          const title = m[1].trim()
          const dataStr = m[2]
          const data = dataStr.split('|').map(item => {
            const parts = item.split(':')
            const label = parts[0]?.trim() || ''
            const value = parseFloat(parts[1]) || 0
            return { label, value }
          }).filter(d => d.value > 0 && d.label)
          return { title, data }
        }
      }
    ]
    
    // Find all special blocks with positions
    const blocks = []
    patterns.forEach(({ regex, type, extract }) => {
      const re = new RegExp(regex.source, regex.flags)
      let match
      while ((match = re.exec(content)) !== null) {
        blocks.push({
          type,
          start: match.index,
          end: match.index + match[0].length,
          data: extract(match)
        })
      }
    })
    
    // Sort by position
    blocks.sort((a, b) => a.start - b.start)
    
    // Split content into parts
    let lastEnd = 0
    blocks.forEach(block => {
      // Text before this block
      if (block.start > lastEnd) {
        const text = content.slice(lastEnd, block.start).trim()
        if (text) {
          result.push({ type: 'markdown', content: text })
        }
      }
      // The block itself
      result.push({ type: block.type, data: block.data })
      lastEnd = block.end
    })
    
    // Remaining text after last block
    if (lastEnd < content.length) {
      const text = content.slice(lastEnd).trim()
      if (text) {
        result.push({ type: 'markdown', content: text })
      }
    }
    
    // If no special blocks found, return single markdown part
    if (result.length === 0 && content.trim()) {
      result.push({ type: 'markdown', content: content.trim() })
    }
    
    return result
  }, [content])
  
  if (parts.length === 0) return null
  
  return (
    <div className={`space-y-4 ${className}`}>
      {parts.map((part, i) => {
        if (part.type === 'html') {
          return (
            <div key={i} className="my-3">
              <SafeHtmlFrame html={part.data} />
            </div>
          )
        }
        
        if (part.type === 'pie') {
          return (
            <PieChart key={i} title={part.data.title} data={part.data.data} />
          )
        }
        
        // Regular markdown content
        return <MarkdownRenderer key={i} content={part.content} />
      })}
    </div>
  )
}

// Export components for direct use
export { PieChart, SafeHtmlFrame }
