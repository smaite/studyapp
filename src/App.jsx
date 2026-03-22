import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { useState, createContext } from 'react'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Landing from './pages/Landing'
import Subjects from './pages/Subjects'
import Tutor from './pages/Tutor'
import ExamPrep from './pages/ExamPrep'

export const AppContext = createContext()

function App() {
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [chatHistory, setChatHistory] = useState([])

  const contextValue = {
    selectedSubject,
    setSelectedSubject,
    chatHistory,
    setChatHistory
  }

  return (
    <AppContext.Provider value={contextValue}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/tutor" element={<Tutor />} />
              <Route path="/tutor/:subject" element={<Tutor />} />
              <Route path="/exam-prep" element={<ExamPrep />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </AppContext.Provider>
  )
}

export default App
