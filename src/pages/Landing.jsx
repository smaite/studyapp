import { Link } from 'react-router-dom'
import { 
  GraduationCap, Sparkles, Clock, TrendingUp, Users, CheckCircle, 
  ArrowRight, Star, BookOpen, Brain, Target, Zap, Quote
} from 'lucide-react'

const subjects = [
  { name: 'Mathematics', icon: '📐', color: 'bg-blue-500' },
  { name: 'Physics', icon: '⚡', color: 'bg-purple-500' },
  { name: 'Chemistry', icon: '🧪', color: 'bg-green-500' },
  { name: 'Biology', icon: '🧬', color: 'bg-pink-500' },
  { name: 'History', icon: '📜', color: 'bg-amber-500' },
  { name: 'Languages', icon: '🌍', color: 'bg-cyan-500' },
]

const features = [
  {
    icon: Brain,
    title: 'Smart Explanations',
    description: 'AI breaks down complex concepts into simple, understandable steps tailored to your level.'
  },
  {
    icon: Clock,
    title: '24/7 Availability',
    description: 'Get help whenever you need it. No scheduling, no waiting. Just instant assistance.'
  },
  {
    icon: Target,
    title: 'Personalized Learning',
    description: 'Adaptive tutoring that adjusts to your pace and learning style for maximum effectiveness.'
  },
  {
    icon: Zap,
    title: 'Instant Feedback',
    description: 'Upload problems, get immediate solutions with detailed explanations and next steps.'
  }
]

const testimonials = [
  {
    name: 'Alex M.',
    role: 'High School Student',
    content: 'StudyAI helped me understand calculus in a way my teacher never could. My grades improved from C to A in just one semester!',
    rating: 5
  },
  {
    name: 'Sarah L.',
    role: 'University Student',
    content: 'The step-by-step explanations are incredible. It\'s like having a patient tutor available whenever I need help.',
    rating: 5
  },
  {
    name: 'Michael R.',
    role: 'Parent',
    content: 'My daughter now actually enjoys studying. The AI makes learning feel like a conversation, not a lecture.',
    rating: 5
  }
]

const stats = [
  { value: '50K+', label: 'Active Students' },
  { value: '1M+', label: 'Questions Answered' },
  { value: '4.9', label: 'Average Rating' },
  { value: '95%', label: 'Grade Improvement' }
]

export default function Landing() {
  return (
    <div className="overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 lg:py-32 px-4">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 via-white to-secondary-50 -z-10" />
        <div className="absolute top-20 right-20 w-72 h-72 bg-primary-200 rounded-full blur-3xl opacity-30 -z-10" />
        <div className="absolute bottom-20 left-20 w-96 h-96 bg-secondary-200 rounded-full blur-3xl opacity-30 -z-10" />
        
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              AI-Powered Learning Platform
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              Learn Faster with Your
              <span className="gradient-text"> Personal AI Tutor</span>
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Get instant help with any subject. Our AI tutor provides personalized explanations, 
              step-by-step solutions, and adapts to your learning style.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tutor" className="btn-primary inline-flex items-center justify-center gap-2">
                Start Learning Free
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link to="/subjects" className="btn-secondary inline-flex items-center justify-center gap-2">
                Browse Subjects
                <BookOpen className="h-5 w-5" />
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-gray-900">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Subjects Preview */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Master Any Subject
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              From elementary math to advanced physics, our AI tutor is ready to help you succeed.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {subjects.map((subject, index) => (
              <Link
                key={index}
                to={`/tutor/${subject.name.toLowerCase()}`}
                className="card hover:scale-105 text-center group"
              >
                <div className={`text-4xl mb-3`}>{subject.icon}</div>
                <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                  {subject.name}
                </h3>
              </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link 
              to="/subjects" 
              className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium"
            >
              View All Subjects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Students Love StudyAI
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Designed by educators and powered by advanced AI to give you the best learning experience.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="card text-center">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-2xl mb-4">
                  <feature.icon className="h-7 w-7 text-primary-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-lg text-gray-600">
              Getting help is as easy as 1-2-3
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '1', title: 'Choose Your Subject', desc: 'Select from our wide range of subjects or type your question directly.' },
              { step: '2', title: 'Ask Your Question', desc: 'Type your question or upload an image of a problem you need help with.' },
              { step: '3', title: 'Learn & Understand', desc: 'Get clear, step-by-step explanations tailored to your learning level.' }
            ].map((item, index) => (
              <div key={index} className="relative">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white text-2xl font-bold rounded-2xl mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-[60%] w-[80%] border-t-2 border-dashed border-gray-300" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              What Students Say
            </h2>
            <p className="text-lg text-gray-600">
              Join thousands of happy learners
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <div key={index} className="card">
                <div className="flex gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic">"{testimonial.content}"</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-500">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Start learning smarter today. No credit card required.
          </p>
          <Link 
            to="/tutor" 
            className="inline-flex items-center gap-2 bg-white text-primary-600 font-semibold py-4 px-8 rounded-xl hover:bg-gray-100 transition-all shadow-lg hover:shadow-xl"
          >
            Get Started Free
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}
