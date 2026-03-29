// AI Service Configuration
// Split API routing:
// - EXTRACTION_API: api.gthpanel.qzz.io for gemini models
// - CHAT_API: gthpanel.qzz.io for claude models (via Netlify proxy)
const EXTRACTION_API = 'https://api.gthpanel.qzz.io'
const CHAT_API = '/api/ai'
const API_KEY = import.meta.env.VITE_AI_API_KEY || 'dummy'

// Model routing:
// - HEAVY_MODEL: gemini-3-flash for extraction (api.gthpanel)
// - FAST_MODEL: claude-haiku-4.5 for chat (gthpanel)
const HEAVY_MODEL = 'gemini-3-flash'
const FAST_MODEL = import.meta.env.VITE_AI_FAST_MODEL || 'gpt-5.4-mini'

const DEBUG_AI = true

const logAi = (...args) => {
  if (DEBUG_AI) console.log('[AI Service]', ...args)
}

const normalizeAssistantIdentity = (text) => String(text || '')
  .replace(/\bantigravity ai\b/gi, 'Kira AI')
  .replace(/\bantigravity\b/gi, 'Kira AI')

const extractTextFromApiData = (data) => {
  if (!data) return null

  // Anthropic format
  if (Array.isArray(data.content)) {
    const textBlock = data.content.find(block => block?.type === 'text' && typeof block?.text === 'string')
    if (textBlock?.text) return textBlock.text
    if (typeof data.content[0]?.text === 'string') return data.content[0].text
  }

  // OpenAI-compatible formats
  if (typeof data.content === 'string') return data.content
  if (typeof data.output_text === 'string') return data.output_text
  if (typeof data.message?.content === 'string') return data.message.content
  if (Array.isArray(data.choices)) {
    const c0 = data.choices[0]
    if (typeof c0?.message?.content === 'string') return c0.message.content
    if (typeof c0?.text === 'string') return c0.text
  }

  return null
}

const toImagePayload = (dataUrlOrBase64) => {
  const value = String(dataUrlOrBase64 || '')
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/)
  if (match) {
    return { mediaType: match[1], data: match[2] }
  }
  return { mediaType: 'image/jpeg', data: value.replace(/^data:image\/\w+;base64,/, '') }
}

export const analyzeDocument = async (content, fileType, subject, question) => {
  const reqId = `doc-${Date.now()}`
  const systemPrompt = `You are an expert AI tutor helping a student study for their ${subject || 'exam'}. 
Your assistant name is Kira AI. If referring to yourself, always say Kira AI.
The student has uploaded study materials. Analyze the content and help them understand it.

Guidelines:
- Summarize key concepts
- Identify important topics for exam prep
- Highlight formulas, definitions, or key facts
- Suggest areas to focus on
- Create study notes from the content`

  const imagePayload = fileType === 'image' ? toImagePayload(content) : null
  const userContent = fileType === 'image' 
    ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imagePayload.mediaType,
            data: imagePayload.data
          }
        },
        {
          type: 'text',
          text: question || 'Please analyze this study material and create comprehensive study notes. Identify key concepts, important facts, and topics I should focus on for my exam.'
        }
      ]
    : question || `Please analyze this study material and create comprehensive study notes:\n\n${content}`

  const requestBody = {
    model: HEAVY_MODEL,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: userContent
    }]
  }

  try {
    logAi(reqId, 'request', { endpoint: `${EXTRACTION_API}/v1/messages`, model: HEAVY_MODEL, subject, fileType })
    const response = await fetch(`${EXTRACTION_API}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      logAi(reqId, 'http_error', { status: response.status })
      throw new Error(`API Error: ${response.status}`)
    }

    const raw = await response.text()
    logAi(reqId, 'raw_response_preview', raw.substring(0, 180))
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      logAi(reqId, 'json_parse_error', raw.substring(0, 220))
      throw new Error(`Proxy returned invalid JSON: ${raw.substring(0, 200)}`)
    }

    const text = extractTextFromApiData(data)
    if (typeof text === 'string' && text.trim()) return { content: normalizeAssistantIdentity(text) }
    logAi(reqId, 'unexpected_format', { keys: Object.keys(data || {}), contentType: typeof data?.content })
    throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 200)}`)
  } catch (error) {
    console.error('Document Analysis Error:', error)
    throw error
  }
}

export const sendMessage = async (messages, subject = null, onChunk = null) => {
  const reqId = `msg-${Date.now()}`
  const tutorScope = subject ? `specializing in ${subject}` : 'for all study topics'
  const systemPrompt = `You are Kira AI, a human-like personal tutor ${tutorScope}.

Teaching flow (always follow):
1) Explain briefly in simple language
2) Give one practical example
3) Ask one focused check question
4) Give supportive feedback and next step

Style rules:
- Sound natural and warm like a smart friend.
- Keep responses concise and structured (bullets/steps).
- If learner is confused, re-explain simpler with a new analogy.
- If learner is doing well, increase difficulty gradually.
- Reference earlier context when relevant.
- End with: quick recap + one check question.
- For requests like "plot/graph/chart x=.. y=..", give a short explanation only and avoid long code blocks unless user explicitly asks for code.

HTML Preview (use when visual layout helps):
- When user asks for: letters, applications, formal documents, invitations, resumes, reports, certificates, or any formatted document -- use HTML preview.
- Wrap visual HTML content in: \`\`\`html-preview ... \`\`\`
- Use Tailwind CSS classes for styling. Available classes: document, letter, formal-letter, card, application, letter-header, letter-footer, signature, date, subject
- For data visualization, use: [[pie:Title|Label1:Value1|Label2:Value2|...]]
- ONLY use HTML preview when formatting genuinely helps (documents, charts, styled layouts). For explanations, use regular markdown.
- Never show raw HTML code to user -- always use the html-preview block so it renders as preview.

Humor policy:
- You may use light, witty dark humor to keep engagement.
- Never use harmful dark humor (self-harm, abuse, hate, trauma, religion, race, disability, personal attacks).
- If user tone is uncomfortable, switch to neutral supportive tone immediately.

Identity:
- If referring to yourself, always use the name "Kira AI".`

  const safeMessages = Array.isArray(messages)
    ? messages
        .filter((msg) => msg && typeof msg === 'object')
        .map((msg) => ({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: typeof msg.content === 'string' ? msg.content : ''
        }))
    : []

  // Build messages with system prompt as first user message if needed
  const apiMessages = [
    { role: 'user', content: systemPrompt },
    { role: 'assistant', content: 'I understand. I am Kira AI, and I will teach in clear, human-like steps with supportive feedback. What should we learn first?' },
    ...safeMessages
  ]

  const requestBody = {
    model: FAST_MODEL,
    max_tokens: 2048,
    messages: apiMessages
  }

  try {
    logAi(reqId, 'request', { endpoint: `${CHAT_API}/v1/messages`, model: FAST_MODEL, subject, messageCount: safeMessages.length })
    const response = await fetch(`${CHAT_API}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      logAi(reqId, 'http_error', { status: response.status, errorData: errorData.substring(0, 220) })
      throw new Error(`API Error: ${response.status} - ${errorData}`)
    }

    const raw = await response.text()
    logAi(reqId, 'raw_response_preview', raw.substring(0, 180))
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      logAi(reqId, 'json_parse_error', raw.substring(0, 220))
      throw new Error(`Proxy returned invalid JSON: ${raw.substring(0, 200)}`)
    }

    const text = extractTextFromApiData(data)
    if (typeof text === 'string' && text.trim()) {
      logAi(reqId, 'success', { textLength: text.length })
      const normalized = normalizeAssistantIdentity(text)
      if (onChunk) onChunk(normalized)
      return { content: normalized }
    }
    logAi(reqId, 'unexpected_format', { keys: Object.keys(data || {}), contentType: typeof data?.content })
    throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 200)}`)
  } catch (error) {
    console.error('AI Service Error:', error)
    throw error
  }
}

export const analyzeImage = async (imageBase64, question, subject = null) => {
  const reqId = `img-${Date.now()}`
  const systemContext = subject
    ? `You are an expert AI tutor specializing in ${subject}. Your assistant name is Kira AI. If referring to yourself, always say Kira AI. The student has shared an image (likely a problem or question). Analyze it carefully and help them understand and solve it step by step.`
    : `You are a helpful AI tutor. Your assistant name is Kira AI. If referring to yourself, always say Kira AI. The student has shared an image. Analyze it and provide helpful guidance.`

  const imagePayload = toImagePayload(imageBase64)
  const requestBody = {
    model: HEAVY_MODEL,
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: imagePayload.mediaType,
            data: imagePayload.data
          }
        },
        {
          type: 'text',
          text: `${systemContext}\n\n${question || 'Please analyze this image and help me understand/solve it.'}`
        }
      ]
    }]
  }

  try {
    logAi(reqId, 'request', { endpoint: `${EXTRACTION_API}/v1/messages`, model: HEAVY_MODEL, subject, imageBytes: imageBase64?.length || 0 })
    const response = await fetch(`${EXTRACTION_API}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      logAi(reqId, 'http_error', { status: response.status })
      throw new Error(`API Error: ${response.status}`)
    }

    const raw = await response.text()
    logAi(reqId, 'raw_response_preview', raw.substring(0, 180))
    let data
    try {
      data = JSON.parse(raw)
    } catch {
      logAi(reqId, 'json_parse_error', raw.substring(0, 220))
      throw new Error(`Proxy returned invalid JSON: ${raw.substring(0, 200)}`)
    }

    const text = extractTextFromApiData(data)
    if (typeof text === 'string' && text.trim()) {
      logAi(reqId, 'success', { textLength: text.length })
      return { content: normalizeAssistantIdentity(text) }
    }
    logAi(reqId, 'unexpected_format', { keys: Object.keys(data || {}), contentType: typeof data?.content })
    throw new Error(`Unexpected response format: ${JSON.stringify(data).substring(0, 200)}`)
  } catch (error) {
    console.error('Image Analysis Error:', error)
    throw error
  }
}

export const generateStudyPlan = async (subject, examDate, topics, currentLevel) => {
  const daysUntilExam = Math.ceil((new Date(examDate) - new Date()) / (1000 * 60 * 60 * 24))
  
  const prompt = `Create a detailed study plan for a student preparing for a ${subject} exam.

Details:
- Days until exam: ${daysUntilExam}
- Topics to cover: ${topics.join(', ')}
- Current level: ${currentLevel}

Please provide:
1. A day-by-day study schedule
2. Key concepts to focus on each day
3. Practice problem suggestions
4. Review sessions
5. Tips for exam day

Format the response in a clear, organized way using markdown.`

  return sendMessage([{ role: 'user', content: prompt }], subject)
}

export const generatePracticeQuestions = async (subject, topic, difficulty, count = 5) => {
  const prompt = `Generate ${count} practice questions for ${subject} on the topic of "${topic}" at ${difficulty} difficulty level.

For each question:
1. State the question clearly
2. Provide multiple choice options (A, B, C, D) if applicable
3. Include the correct answer
4. Provide a brief explanation

Format using markdown for clarity.`

  return sendMessage([{ role: 'user', content: prompt }], subject)
}
