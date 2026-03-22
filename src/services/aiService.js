const API_BASE_URL = '/api'

export const analyzeDocument = async (content, fileType, subject, question) => {
  const systemPrompt = `You are an expert AI tutor helping a student study for their ${subject || 'exam'}. 
The student has uploaded study materials. Analyze the content and help them understand it.

Guidelines:
- Summarize key concepts
- Identify important topics for exam prep
- Highlight formulas, definitions, or key facts
- Suggest areas to focus on
- Create study notes from the content`

  const userContent = fileType === 'image' 
    ? [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: content.replace(/^data:image\/\w+;base64,/, '')
          }
        },
        {
          type: 'text',
          text: question || 'Please analyze this study material and create comprehensive study notes. Identify key concepts, important facts, and topics I should focus on for my exam.'
        }
      ]
    : question || `Please analyze this study material and create comprehensive study notes:\n\n${content}`

  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: userContent
    }]
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    return { content: data.content[0].text }
  } catch (error) {
    console.error('Document Analysis Error:', error)
    throw error
  }
}

export const sendMessage = async (messages, subject = null, onChunk = null) => {
  const systemPrompt = subject 
    ? `You are an expert AI tutor specializing in ${subject}. Your role is to help students understand concepts deeply, not just give answers. 
    
Guidelines:
- Break down complex problems into smaller, manageable steps
- Ask guiding questions to help students think critically
- Provide clear explanations with examples
- Use analogies and real-world connections when helpful
- Encourage the student and celebrate their progress
- If the student is stuck, give hints before revealing solutions
- For math/science problems, show your work step by step
- Use markdown formatting for better readability (code blocks, lists, bold for key terms)`
    : `You are a friendly and knowledgeable AI tutor. Help students learn effectively by:
- Breaking down complex topics into understandable parts
- Providing step-by-step explanations
- Using examples and analogies
- Encouraging critical thinking
- Being patient and supportive
Use markdown formatting for clarity.`

  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    stream: true,
    system: systemPrompt,
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`API Error: ${response.status} - ${errorData}`)
    }

    if (onChunk) {
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                fullText += parsed.delta.text
                onChunk(fullText)
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }

      return { content: fullText }
    } else {
      const data = await response.json()
      return { content: data.content[0].text }
    }
  } catch (error) {
    console.error('AI Service Error:', error)
    throw error
  }
}

export const analyzeImage = async (imageBase64, question, subject = null) => {
  const systemPrompt = subject
    ? `You are an expert AI tutor specializing in ${subject}. The student has shared an image (likely a problem or question). Analyze it carefully and help them understand and solve it step by step.`
    : `You are a helpful AI tutor. The student has shared an image. Analyze it and provide helpful guidance.`

  const requestBody = {
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: imageBase64.replace(/^data:image\/\w+;base64,/, '')
          }
        },
        {
          type: 'text',
          text: question || 'Please analyze this image and help me understand/solve it.'
        }
      ]
    }]
  }

  try {
    const response = await fetch(`${API_BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'test',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }

    const data = await response.json()
    return { content: data.content[0].text }
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
