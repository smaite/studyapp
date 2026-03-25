// Voice Service - Free using Web Speech API (browser built-in)
// Supports Text-to-Speech and Speech-to-Text

class VoiceService {
  constructor() {
    this.synth = window.speechSynthesis
    this.recognition = null
    this.isListening = false
    this.selectedVoice = null
    this.language = 'en-US' // 'en-US' or 'hi-IN'
    
    // Initialize speech recognition if available
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      this.recognition = new SpeechRecognition()
      this.recognition.continuous = false
      this.recognition.interimResults = true
    }
    
    // Load voices when available
    if (this.synth) {
      this.synth.onvoiceschanged = () => this.loadVoices()
      this.loadVoices()
    }
  }

  loadVoices() {
    const voices = this.synth.getVoices()
    
    // Prefer female voices for the selected language
    const femaleKeywords = ['female', 'woman', 'zira', 'samantha', 'victoria', 'karen', 'moira', 'tessa', 'fiona', 'veena', 'lekha']
    
    // Find best voice for current language
    const langCode = this.language.split('-')[0]
    const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langCode))
    
    // Try to find a female voice
    let femaleVoice = langVoices.find(v => 
      femaleKeywords.some(kw => v.name.toLowerCase().includes(kw))
    )
    
    // If no female voice found, use first available for language
    this.selectedVoice = femaleVoice || langVoices[0] || voices[0]
    
    return voices
  }

  setLanguage(lang) {
    // lang: 'english' or 'hindi'
    this.language = lang === 'hindi' ? 'hi-IN' : 'en-US'
    this.loadVoices()
    
    if (this.recognition) {
      this.recognition.lang = this.language
    }
  }

  getAvailableVoices() {
    return this.synth.getVoices()
  }

  // Text-to-Speech: Speak text aloud
  speak(text, onEnd = null) {
    if (!this.synth) {
      console.warn('Speech synthesis not supported')
      return false
    }

    // Cancel any ongoing speech
    this.synth.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = this.selectedVoice
    utterance.lang = this.language
    utterance.rate = 1.0
    utterance.pitch = 1.1 // Slightly higher pitch for friendlier tone
    utterance.volume = 1.0

    if (onEnd) {
      utterance.onend = onEnd
    }

    utterance.onerror = (e) => {
      console.error('Speech error:', e)
    }

    this.synth.speak(utterance)
    return true
  }

  // Stop speaking
  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel()
    }
  }

  // Check if currently speaking
  isSpeaking() {
    return this.synth?.speaking || false
  }

  // Speech-to-Text: Start listening
  startListening(onResult, onError = null) {
    if (!this.recognition) {
      console.warn('Speech recognition not supported')
      if (onError) onError('Speech recognition not supported in this browser')
      return false
    }

    this.recognition.lang = this.language
    
    this.recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      onResult({
        final: finalTranscript,
        interim: interimTranscript,
        isFinal: finalTranscript.length > 0
      })
    }

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error)
      this.isListening = false
      if (onError) onError(event.error)
    }

    this.recognition.onend = () => {
      this.isListening = false
    }

    try {
      this.recognition.start()
      this.isListening = true
      return true
    } catch (e) {
      console.error('Failed to start recognition:', e)
      return false
    }
  }

  // Stop listening
  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  // Check if currently listening
  getIsListening() {
    return this.isListening
  }

  // Check browser support
  static isSupported() {
    return {
      tts: 'speechSynthesis' in window,
      stt: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
    }
  }
}

// Singleton instance
const voiceService = new VoiceService()
export default voiceService
