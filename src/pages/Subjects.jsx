import { Link } from 'react-router-dom'
import { 
  Calculator, Atom, FlaskConical, Dna, Globe, BookOpen, 
  History, Languages, Code, Brain, Palette, Music,
  TrendingUp, Scale, Lightbulb, Plus
} from 'lucide-react'

const subjects = [
  { 
    id: 'math', 
    name: 'Mathematics', 
    icon: Calculator, 
    color: 'bg-blue-500',
    description: 'Algebra, Calculus, Geometry, Statistics and more',
    topics: ['Algebra', 'Calculus', 'Geometry', 'Trigonometry', 'Statistics']
  },
  { 
    id: 'physics', 
    name: 'Physics', 
    icon: Atom, 
    color: 'bg-purple-500',
    description: 'Mechanics, Thermodynamics, Electricity, Optics',
    topics: ['Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Quantum Physics']
  },
  { 
    id: 'chemistry', 
    name: 'Chemistry', 
    icon: FlaskConical, 
    color: 'bg-green-500',
    description: 'Organic, Inorganic, Physical Chemistry',
    topics: ['Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Biochemistry']
  },
  { 
    id: 'biology', 
    name: 'Biology', 
    icon: Dna, 
    color: 'bg-pink-500',
    description: 'Cell Biology, Genetics, Ecology, Anatomy',
    topics: ['Cell Biology', 'Genetics', 'Ecology', 'Human Anatomy', 'Evolution']
  },
  { 
    id: 'history', 
    name: 'History', 
    icon: History, 
    color: 'bg-amber-500',
    description: 'World History, Ancient Civilizations, Modern Era',
    topics: ['Ancient History', 'Medieval History', 'Modern History', 'World Wars']
  },
  { 
    id: 'geography', 
    name: 'Geography', 
    icon: Globe, 
    color: 'bg-cyan-500',
    description: 'Physical Geography, Human Geography, Maps',
    topics: ['Physical Geography', 'Human Geography', 'Cartography', 'Climate']
  },
  { 
    id: 'english', 
    name: 'English', 
    icon: BookOpen, 
    color: 'bg-rose-500',
    description: 'Grammar, Literature, Writing, Comprehension',
    topics: ['Grammar', 'Literature', 'Essay Writing', 'Vocabulary']
  },
  { 
    id: 'languages', 
    name: 'Languages', 
    icon: Languages, 
    color: 'bg-indigo-500',
    description: 'Spanish, French, German, and more',
    topics: ['Spanish', 'French', 'German', 'Mandarin', 'Japanese']
  },
  { 
    id: 'computer-science', 
    name: 'Computer Science', 
    icon: Code, 
    color: 'bg-slate-600',
    description: 'Programming, Algorithms, Data Structures',
    topics: ['Programming', 'Algorithms', 'Data Structures', 'Web Development']
  },
  { 
    id: 'psychology', 
    name: 'Psychology', 
    icon: Brain, 
    color: 'bg-violet-500',
    description: 'Cognitive, Behavioral, Developmental Psychology',
    topics: ['Cognitive Psychology', 'Behavioral Psychology', 'Developmental Psychology']
  },
  { 
    id: 'economics', 
    name: 'Economics', 
    icon: TrendingUp, 
    color: 'bg-emerald-500',
    description: 'Micro, Macro Economics, Finance',
    topics: ['Microeconomics', 'Macroeconomics', 'Finance', 'International Trade']
  },
  { 
    id: 'philosophy', 
    name: 'Philosophy', 
    icon: Lightbulb, 
    color: 'bg-orange-500',
    description: 'Ethics, Logic, Metaphysics, Epistemology',
    topics: ['Ethics', 'Logic', 'Metaphysics', 'Political Philosophy']
  },
]

export default function Subjects() {
  return (
    <div className="py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Subject
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select a subject to start learning with your AI tutor. 
            Get personalized help tailored to your level and pace.
          </p>
        </div>

        {/* Subject Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {subjects.map((subject) => (
            <Link
              key={subject.id}
              to="/exam-prep"
              className="card group hover:scale-[1.02] transition-all duration-300"
            >
              <div className="flex items-start gap-4">
                <div className={`${subject.color} p-3 rounded-xl text-white shrink-0`}>
                  <subject.icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors mb-1">
                    {subject.name}
                  </h3>
                  <p className="text-sm text-gray-500 mb-3">
                    {subject.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {subject.topics.slice(0, 3).map((topic, idx) => (
                      <span 
                        key={idx}
                        className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                      >
                        {topic}
                      </span>
                    ))}
                    {subject.topics.length > 3 && (
                      <span className="text-xs text-gray-400">
                        +{subject.topics.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </Link>
          ))}

          {/* Create Custom Subject Card */}
          <Link
            to="/exam-prep"
            className="card group border-2 border-dashed border-gray-300 hover:border-primary-400 bg-gray-50 hover:bg-primary-50 transition-all"
          >
            <div className="flex flex-col items-center justify-center h-full py-4 text-center">
              <div className="bg-gray-200 group-hover:bg-primary-200 p-3 rounded-xl mb-3 transition-colors">
                <Plus className="h-6 w-6 text-gray-500 group-hover:text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-700 group-hover:text-primary-600 transition-colors mb-1">
                Can't find your subject?
              </h3>
              <p className="text-sm text-gray-500">
                Ask about anything!
              </p>
            </div>
          </Link>
        </div>

        {/* Info Banner */}
        <div className="mt-12 bg-gradient-to-r from-primary-600 to-primary-700 rounded-2xl p-8 text-white">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-2xl font-bold mb-2">Ready for your exam?</h3>
              <p className="text-primary-100">
                Create a personalized study plan with practice questions and progress tracking.
              </p>
            </div>
            <Link 
              to="/exam-prep"
              className="shrink-0 bg-white text-primary-600 font-semibold py-3 px-6 rounded-xl hover:bg-gray-100 transition-colors"
            >
              Start Exam Prep
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
