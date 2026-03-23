import { useState } from 'react'
import { ChevronDown, ChevronUp, CheckCircle2, Lightbulb } from 'lucide-react'
import MarkdownRenderer from './MarkdownRenderer'

export default function SolvingSteps({ steps, solution, tip }) {
  const [expandedSteps, setExpandedSteps] = useState({})

  const toggleStep = (index) => {
    setExpandedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  return (
    <div className="bg-gray-900/50 rounded-2xl border border-gray-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm">SOLVING STEPS</h3>
        <button className="text-gray-500 hover:text-gray-300 text-xs">
          Show all
        </button>
      </div>

      {/* Steps */}
      <div className="divide-y divide-gray-800">
        {steps.map((step, index) => (
          <div key={index} className="px-4 py-3">
            <button
              onClick={() => toggleStep(index)}
              className="w-full flex items-start justify-between text-left"
            >
              <div className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center text-xs text-gray-400 font-medium">
                  {index + 1}
                </span>
                <div>
                  <p className="text-gray-300 text-sm">{step.description}</p>
                  {step.math && (
                    <div className="mt-2">
                      <MarkdownRenderer content={`$${step.math}$`} />
                    </div>
                  )}
                </div>
              </div>
              <span className="text-gray-500 ml-2">
                {expandedSteps[index] ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </span>
            </button>
            
            {expandedSteps[index] && step.explanation && (
              <div className="mt-3 ml-9 pl-3 border-l-2 border-primary-500/30">
                <MarkdownRenderer 
                  content={step.explanation} 
                  className="text-sm text-gray-400"
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Solution */}
      {solution && (
        <div className="px-4 py-3 border-t border-gray-800 bg-gray-800/30">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400 text-xs font-semibold uppercase">Solution</span>
          </div>
          <div className="text-xl font-bold text-white">
            <MarkdownRenderer content={solution} />
          </div>
        </div>
      )}

      {/* Tip */}
      {tip && (
        <div className="mx-4 mb-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-amber-300 font-semibold text-sm mb-1">{tip.title}</h4>
              <p className="text-amber-200/80 text-sm">{tip.content}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
