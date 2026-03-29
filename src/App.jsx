import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useState, createContext } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Subjects from './pages/Subjects'
import Tutor from './pages/Tutor'
import ExamPrep from './pages/ExamPrep'
import Leaderboard from './pages/Leaderboard'
import Login from './pages/Login'
import Signup from './pages/Signup'
import { Loader2 } from 'lucide-react'

export const AppContext = createContext()

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }
  
  if (!user) {
    // Save the current URL to redirect back after login
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} />
  }
  
  return children
}

// Public route that redirects to app if logged in
function PublicRoute({ children }) {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    )
  }
  
  if (user) {
    return <Navigate to="/exam-prep" />
  }
  
  return children
}

function AppRoutes() {
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [chatHistory, setChatHistory] = useState({})

  const contextValue = {
    selectedSubject,
    setSelectedSubject,
    chatHistory,
    setChatHistory
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={
          <PublicRoute><Login /></PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute><Signup /></PublicRoute>
        } />
        
        {/* Public Landing */}
        <Route path="/" element={
          <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
            <Navbar />
            <main className="flex-grow"><Landing /></main>
            <Footer />
          </div>
        } />
        
        {/* Protected Routes */}
        <Route path="/subjects" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
              <Navbar />
              <main className="flex-grow"><Subjects /></main>
              <Footer />
            </div>
          </ProtectedRoute>
        } />
        <Route path="/tutor" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
              <Navbar />
              <main className="flex-grow"><Tutor /></main>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/tutor/:subject" element={
          <ProtectedRoute>
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
              <Navbar />
              <main className="flex-grow"><Tutor /></main>
            </div>
          </ProtectedRoute>
        } />
        <Route path="/exam-prep" element={
          <ProtectedRoute>
            <ExamPrep />
          </ProtectedRoute>
        } />
        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Leaderboard />
          </ProtectedRoute>
        } />
      </Routes>
    </AppContext.Provider>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
