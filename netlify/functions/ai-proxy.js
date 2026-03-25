// Netlify serverless function to proxy AI API requests (bypasses CORS)
// Using hardcoded URL since Netlify env vars have issues with encrypted files
const AI_API_URL = 'https://api.gthpanel.qzz.io'

export default async (request, context) => {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version'
      }
    })
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  console.log('[AI Proxy] Using API URL:', AI_API_URL)

  try {
    const body = await request.json()
    console.log('[AI Proxy] Request model:', body.model)
    
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)
    
    const response = await fetch(`${AI_API_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'dummy',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body),
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)

    const data = await response.text()
    console.log('[AI Proxy] Response status:', response.status, 'Length:', data.length)
    
    if (!response.ok) {
      console.error('[AI Proxy] Upstream error:', data.substring(0, 500))
    }
    
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  } catch (error) {
    console.error('[AI Proxy] Error:', error.name, error.message)
    
    if (error.name === 'AbortError') {
      return new Response(JSON.stringify({ 
        error: 'Request timeout - AI response took too long',
        suggestion: 'Try a shorter message or simpler question'
      }), {
        status: 504,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      })
    }
    
    return new Response(JSON.stringify({ 
      error: error.message,
      type: error.name 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    })
  }
}

export const config = {
  path: '/api/ai/v1/messages'
}
