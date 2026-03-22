import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { GraduationCap, Menu, X, BookOpen, MessageSquare, ClipboardList, Sparkles } from 'lucide-react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { path: '/subjects', label: 'Subjects', icon: BookOpen },
    { path: '/tutor', label: 'AI Tutor', icon: MessageSquare },
    { path: '/exam-prep', label: 'Exam Prep', icon: ClipboardList },
  ]

  const isActive = (path) => location.pathname === path

  return (
    <nav className="bg-white/80 backdrop-blur-xl sticky top-0 z-50 border-b border-gray-100/50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="bg-gradient-to-br from-primary-600 to-primary-500 p-2 rounded-xl group-hover:shadow-lg group-hover:shadow-primary-500/25 transition-all">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Study<span className="text-primary-600">AI</span></span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  isActive(path)
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link to="/tutor" className="btn-primary text-sm py-2.5 px-5 flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Start Learning
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-gray-100 animate-in">
            {navLinks.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-1 ${
                  isActive(path)
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            ))}
            <div className="mt-4 px-4">
              <Link
                to="/tutor"
                onClick={() => setIsOpen(false)}
                className="btn-primary block text-center"
              >
                Start Learning
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
