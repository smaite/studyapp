import { Link } from 'react-router-dom'
import { GraduationCap, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="bg-primary-600 p-2 rounded-xl">
                <GraduationCap className="h-6 w-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">StudyAI</span>
            </Link>
            <p className="text-gray-400 max-w-md">
              Your AI-powered learning companion. Get personalized tutoring in any subject, 
              anytime. Learn smarter, not harder.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/subjects" className="hover:text-primary-400 transition-colors">
                  Browse Subjects
                </Link>
              </li>
              <li>
                <Link to="/exam-prep" className="hover:text-primary-400 transition-colors">
                  Study Hub
                </Link>
              </li>
              <li>
                <Link to="/exam-prep" className="hover:text-primary-400 transition-colors">
                  Exam Prep
                </Link>
              </li>
            </ul>
          </div>

          {/* Subjects */}
          <div>
            <h4 className="text-white font-semibold mb-4">Popular Subjects</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/exam-prep" className="hover:text-primary-400 transition-colors">
                  Mathematics
                </Link>
              </li>
              <li>
                <Link to="/exam-prep" className="hover:text-primary-400 transition-colors">
                  Physics
                </Link>
              </li>
              <li>
                <Link to="/exam-prep" className="hover:text-primary-400 transition-colors">
                  Chemistry
                </Link>
              </li>
              <li>
                <Link to="/exam-prep" className="hover:text-primary-400 transition-colors">
                  Biology
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} StudyAI. Built with ❤️ for learners everywhere.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Github className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Twitter className="h-5 w-5" />
            </a>
            <a href="#" className="text-gray-400 hover:text-white transition-colors">
              <Mail className="h-5 w-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
