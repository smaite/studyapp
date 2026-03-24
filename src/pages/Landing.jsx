import { Link } from 'react-router-dom'
import { 
  GraduationCap, Sparkles, Clock, TrendingUp, Users, CheckCircle, 
  ArrowRight, Star, BookOpen, Brain, Target, Zap, Quote, Upload,
  MessageSquare, FileText, ChevronRight, Play
} from 'lucide-react'

const subjects = [
  { name: 'Mathematics', icon: '📐', color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
  { name: 'Physics', icon: '⚡', color: 'from-purple-500 to-purple-600', bg: 'bg-purple-50' },
  { name: 'Chemistry', icon: '🧪', color: 'from-green-500 to-green-600', bg: 'bg-green-50' },
  { name: 'Biology', icon: '🧬', color: 'from-pink-500 to-pink-600', bg: 'bg-pink-50' },
  { name: 'History', icon: '📜', color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
  { name: 'Languages', icon: '🌍', color: 'from-cyan-500 to-cyan-600', bg: 'bg-cyan-50' },
  { name: 'Computer Science', icon: '💻', color: 'from-slate-500 to-slate-600', bg: 'bg-slate-50' },
  { name: 'Economics', icon: '📊', color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50' },
]

const features = [
  {
    icon: Brain,
    title: 'Smart Explanations',
    description: 'AI breaks down complex concepts into simple, understandable steps tailored to your level.',
    color: 'from-blue-500 to-indigo-500'
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Get help whenever you need it. No scheduling, no waiting. Just instant assistance.',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: Target,
    title: 'Personalized Learning',
    description: 'Adaptive tutoring that adjusts to your pace and learning style for maximum effectiveness.',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: Zap,
    title: 'Instant Feedback',
    description: 'Upload problems, get immediate solutions with detailed explanations and next steps.',
    color: 'from-amber-500 to-orange-500'
  }
]

const testimonials = [
  {
    name: 'Alex M.',
    role: 'High School Student',
    avatar: '👨‍🎓',
    content: 'StudyAI helped me understand calculus in a way my teacher never could. My grades improved from C to A in just one semester!',
    rating: 5
  },
  {
    name: 'Sarah L.',
    role: 'University Student',
    avatar: '👩‍🎓',
    content: "The step-by-step explanations are incredible. It's like having a patient tutor available whenever I need help.",
    rating: 5
  },
  {
    name: 'Michael R.',
    role: 'Parent',
    avatar: '👨‍👧',
    content: 'My daughter now actually enjoys studying. The AI makes learning feel like a conversation, not a lecture.',
    rating: 5
  },
  {
    name: 'Emma K.',
    role: 'Medical Student',
    avatar: '👩‍⚕️',
    content: 'Perfect for studying anatomy and biochemistry. The AI remembers context and builds on previous explanations.',
    rating: 5
  }
]

const stats = [
  { value: '50K+', label: 'Active Students', icon: Users },
  { value: '1M+', label: 'Questions Answered', icon: MessageSquare },
  { value: '4.9', label: 'Average Rating', icon: Star },
  { value: '95%', label: 'Grade Improvement', icon: TrendingUp }
]

const products = [
  {
    title: 'Study Hub',
    description: 'Upload your study materials, set your exam date, and let AI create personalized lessons.',
    icon: FileText,
    color: 'from-primary-500 to-primary-600',
    link: '/exam-prep'
  },
  {
    title: 'Study Materials',
    description: 'Upload PDFs, images, and notes. AI creates comprehensive study guides instantly.',
    icon: Upload,
    color: 'from-secondary-500 to-secondary-600',
    link: '/exam-prep'
  },
  {
    title: 'AI Tutor & Math Solver',
    description: 'Available inside Study Hub for focused exam prep sessions with full context memory.',
    icon: MessageSquare,
    color: 'from-purple-500 to-purple-600',
    link: '/exam-prep'
  }
]

export default function Landing() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-4 bg-mesh">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden -z-10">
          <div className="absolute top-20 right-[10%] w-72 h-72 bg-primary-300 rounded-full blur-[100px] opacity-30 animate-pulse-glow" />
          <div className="absolute bottom-20 left-[10%] w-96 h-96 bg-secondary-300 rounded-full blur-[100px] opacity-30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-primary-200 to-secondary-200 rounded-full blur-[120px] opacity-20" />
        </div>
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-primary-700 px-5 py-2.5 rounded-full text-sm font-medium mb-8 shadow-lg shadow-primary-500/10 border border-primary-100">
              <Sparkles className="h-4 w-4 text-primary-500" />
              AI-Powered Learning Platform
              <span className="bg-primary-500 text-white text-xs px-2 py-0.5 rounded-full">New</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-8 leading-tight tracking-tight">
              Learn Faster with Your
              <span className="block gradient-text mt-2">Personal AI Tutor</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-600 mb-10 max-w-2xl mx-auto leading-relaxed">
              Get instant help with any subject. Our AI tutor provides personalized explanations 
              and adapts to your learning style.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link to="/signup" className="btn-primary inline-flex items-center justify-center gap-2 text-lg py-4 px-8">
                Start Learning Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/exam-prep" className="btn-secondary inline-flex items-center justify-center gap-2 text-lg py-4 px-8">
                <Play className="h-5 w-5" />
                See How It Works
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="card text-center py-4 px-3">
                  <stat.icon className="h-5 w-5 text-primary-500 mx-auto mb-2" />
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Preview */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Subjects</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-4">
              Master Any Subject
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From elementary math to advanced physics, our AI tutor is ready to help you succeed.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {subjects.map((subject, index) => (
              <Link
                key={index}
                to="/exam-prep"
                className={`${subject.bg} rounded-3xl p-6 text-center group hover:scale-105 transition-all duration-300 border border-gray-100 hover:shadow-xl`}
              >
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{subject.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {subject.name}
                </h3>
              </Link>
            ))}
          </div>

          <div className="text-center mt-10">
            <Link 
              to="/subjects" 
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-semibold group"
            >
              View All Subjects
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section className="py-24 px-4 bg-gradient-to-br from-gray-50 to-primary-50/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Products</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-4">
              StudyAI Products
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Upgrade your study experience with cutting-edge AI tools.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {products.map((product, index) => (
              <Link
                key={index}
                to={product.link}
                className="card card-hover group"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${product.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <product.icon className="h-7 w-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{product.title}</h3>
                <p className="text-gray-600 leading-relaxed">{product.description}</p>
                <div className="mt-5 flex items-center text-primary-600 font-medium">
                  Learn more
                  <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Features</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-4">
              Why Students Love StudyAI
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Designed by educators and powered by advanced AI to give you the best learning experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="text-center group">
                <div className={`inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl mb-5 shadow-lg group-hover:scale-110 transition-transform`}>
                  <feature.icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4 bg-gradient-to-br from-primary-600 to-primary-700 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-200 font-semibold text-sm uppercase tracking-wider">Simple Process</span>
            <h2 className="text-4xl md:text-5xl font-bold mt-3 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-primary-100">
              Getting help is as easy as 1-2-3
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {[
              { step: '1', title: 'Choose Your Subject', desc: 'Select from our wide range of subjects or type your question directly.', icon: BookOpen },
              { step: '2', title: 'Ask Your Question', desc: 'Type your question or upload an image of a problem you need help with.', icon: MessageSquare },
              { step: '3', title: 'Learn & Understand', desc: 'Get clear, step-by-step explanations tailored to your learning level.', icon: CheckCircle }
            ].map((item, index) => (
              <div key={index} className="relative text-center">
                <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-white text-primary-600 text-2xl font-bold rounded-2xl mb-5 shadow-xl">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-primary-100 leading-relaxed">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-6 transform -translate-y-1/2">
                    <ChevronRight className="h-8 w-8 text-white/40" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-mesh">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Testimonials</span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mt-3 mb-4">
              What Students Say
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of happy learners
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-5 leading-relaxed">"{testimonial.content}"</p>
                <div className="flex items-center gap-3">
                  <div className="text-3xl">{testimonial.avatar}</div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="card bg-gradient-to-br from-primary-600 to-primary-700 text-white text-center py-16 px-8 glow">
            <Sparkles className="h-12 w-12 mx-auto mb-6 text-primary-200" />
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Ready to Transform Your Learning?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Start learning smarter today. No credit card required.
            </p>
            <Link 
              to="/exam-prep" 
              className="inline-flex items-center gap-2 bg-white text-primary-600 font-bold py-4 px-8 rounded-2xl hover:bg-gray-100 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-0.5 text-lg"
            >
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
