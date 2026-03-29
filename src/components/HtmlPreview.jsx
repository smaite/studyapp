import { useMemo, useRef, useEffect, useState } from 'react'

// Pie chart component for data visualization
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
    
    // Calculate path for pie slice
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    const largeArc = angle > 180 ? 1 : 0
    
    const x1 = 50 + 40 * Math.cos(startRad)
    const y1 = 50 + 40 * Math.sin(startRad)
    const x2 = 50 + 40 * Math.cos(endRad)
    const y2 = 50 + 40 * Math.sin(endRad)
    
    const path = `M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`
    
    return {
      path,
      color: colors[i % colors.length],
      label: item.label || `Item ${i + 1}`,
      value: item.value,
      percentage: percentage.toFixed(1)
    }
  })
  
  return (
    <div className="my-4 p-4 bg-surface-800/60 rounded-xl border border-white/10">
      {title && <h4 className="text-white font-medium mb-3 text-center">{title}</h4>}
      <div className="flex flex-col md:flex-row items-center gap-4">
        <svg viewBox="0 0 100 100" className="w-40 h-40 md:w-48 md:h-48">
          {slices.map((slice, i) => (
            <path
              key={i}
              d={slice.path}
              fill={slice.color}
              stroke="#0f0f1a"
              strokeWidth="0.5"
              className="hover:opacity-80 transition-opacity cursor-pointer"
            >
              <title>{slice.label}: {slice.value} ({slice.percentage}%)</title>
            </path>
          ))}
        </svg>
        <div className="flex flex-col gap-1.5">
          {slices.map((slice, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <div 
                className="w-3 h-3 rounded-sm shrink-0" 
                style={{ backgroundColor: slice.color }}
              />
              <span className="text-gray-300">{slice.label}</span>
              <span className="text-gray-500">({slice.percentage}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Parse pie chart data from special syntax: [[pie:title|label1:value1|label2:value2]]
function parsePieChart(content) {
  const match = content.match(/\[\[pie:([^|]*)\|(.*?)\]\]/s)
  if (!match) return null
  
  const title = match[1].trim()
  const dataStr = match[2]
  const data = dataStr.split('|').map(item => {
    const [label, value] = item.split(':').map(s => s.trim())
    return { label, value: parseFloat(value) || 0 }
  }).filter(d => d.value > 0)
  
  return { title, data }
}

// Safe HTML renderer with Tailwind support
function SafeHtmlFrame({ html, className = '' }) {
  const iframeRef = useRef(null)
  const [height, setHeight] = useState(200)
  
  useEffect(() => {
    if (!iframeRef.current) return
    
    const iframe = iframeRef.current
    const doc = iframe.contentDocument || iframe.contentWindow?.document
    if (!doc) return
    
    // Inject Tailwind CDN and custom styles
    const content = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          * { box-sizing: border-box; }
          body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0;
            padding: 16px;
            background: transparent;
            color: #e5e7eb;
            min-height: auto;
          }
          /* Dark theme defaults */
          .letter, .document, .card {
            background: rgba(30, 30, 50, 0.95);
            border: 1px solid rgba(168, 85, 247, 0.2);
            border-radius: 12px;
            padding: 24px;
          }
          h1, h2, h3, h4 { color: #fff; }
          p { color: #d1d5db; }
          a { color: #a855f7; }
        </style>
      </head>
      <body>
        ${html}
        <script>
          // Send height to parent
          function sendHeight() {
            const height = Math.max(document.body.scrollHeight, document.body.offsetHeight);
            window.parent.postMessage({ type: 'resize', height: height + 32 }, '*');
          }
          sendHeight();
          setTimeout(sendHeight, 100);
          setTimeout(sendHeight, 500);
          new ResizeObserver(sendHeight).observe(document.body);
        </script>
      </body>
      </html>
    `
    
    doc.open()
    doc.write(content)
    doc.close()
  }, [html])
  
  useEffect(() => {
    const handleMessage = (e) => {
      if (e.data?.type === 'resize' && e.data.height) {
        setHeight(Math.min(800, Math.max(100, e.data.height)))
      }
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])
  
  return (
    <iframe
      ref={iframeRef}
      className={`w-full border-0 rounded-xl bg-surface-800/40 ${className}`}
      style={{ height: `${height}px` }}
      sandbox="allow-scripts"
      title="HTML Preview"
    />
  )
}

// Main component that processes content and renders HTML previews inline
export default function HtmlPreview({ content }) {
  const processedContent = useMemo(() => {
    if (!content) return []
    
    const parts = []
    let remaining = content
    
    // Pattern to match HTML preview blocks: ```html-preview ... ``` or [[html]] ... [[/html]]
    const htmlPatterns = [
      /```html-preview\n([\s\S]*?)```/g,
      /\[\[html\]\]([\s\S]*?)\[\[\/html\]\]/g
    ]
    
    // Pattern for pie charts
    const piePattern = /\[\[pie:([^|]*)\|(.*?)\]\]/gs
    
    // Find all special blocks and their positions
    const blocks = []
    
    htmlPatterns.forEach(pattern => {
      let match
      const regex = new RegExp(pattern.source, 'gs')
      while ((match = regex.exec(content)) !== null) {
        blocks.push({
          type: 'html',
          start: match.index,
          end: match.index + match[0].length,
          content: match[1].trim()
        })
      }
    })
    
    let pieMatch
    const pieRegex = new RegExp(piePattern.source, 'gs')
    while ((pieMatch = pieRegex.exec(content)) !== null) {
      const title = pieMatch[1].trim()
      const dataStr = pieMatch[2]
      const data = dataStr.split('|').map(item => {
        const [label, value] = item.split(':').map(s => s.trim())
        return { label, value: parseFloat(value) || 0 }
      }).filter(d => d.value > 0)
      
      blocks.push({
        type: 'pie',
        start: pieMatch.index,
        end: pieMatch.index + pieMatch[0].length,
        title,
        data
      })
    }
    
    // Sort blocks by position
    blocks.sort((a, b) => a.start - b.start)
    
    // Split content by blocks
    let lastEnd = 0
    blocks.forEach(block => {
      // Add text before this block
      if (block.start > lastEnd) {
        const text = content.substring(lastEnd, block.start).trim()
        if (text) {
          parts.push({ type: 'text', content: text })
        }
      }
      
      // Add the block itself
      if (block.type === 'html') {
        parts.push({ type: 'html', content: block.content })
      } else if (block.type === 'pie') {
        parts.push({ type: 'pie', title: block.title, data: block.data })
      }
      
      lastEnd = block.end
    })
    
    // Add remaining text
    if (lastEnd < content.length) {
      const text = content.substring(lastEnd).trim()
      if (text) {
        parts.push({ type: 'text', content: text })
      }
    }
    
    // If no special blocks found, return single text part
    if (parts.length === 0) {
      parts.push({ type: 'text', content })
    }
    
    return parts
  }, [content])
  
  return (
    <div className="space-y-3">
      {processedContent.map((part, i) => {
        if (part.type === 'html') {
          return (
            <div key={i} className="my-3">
              <SafeHtmlFrame html={part.content} />
            </div>
          )
        }
        
        if (part.type === 'pie') {
          return (
            <PieChart key={i} title={part.title} data={part.data} />
          )
        }
        
        // Return text content (will be rendered by parent)
        return (
          <div key={i} data-type="text" data-content={part.content}>
            {/* This will be processed by MarkdownRenderer in parent */}
          </div>
        )
      })}
    </div>
  )
}

// Export individual components for direct use
export { PieChart, SafeHtmlFrame, parsePieChart }
