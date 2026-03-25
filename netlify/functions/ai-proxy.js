// Netlify standard function (not Edge) to proxy AI API requests
// Uses gthpanel.qzz.io for claude models
const AI_API_URL = 'https://gthpanel.qzz.io'

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, x-api-key, anthropic-version',
    'Content-Type': 'application/json'
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    }
  }

  try {
    const body = JSON.parse(event.body)
    console.log('[AI Proxy] Request model:', body.model)
    
    const response = await fetch(`${AI_API_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'dummy',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(body)
    })

    const data = await response.text()
    console.log('[AI Proxy] Response status:', response.status)
    
    return {
      statusCode: response.status,
      headers,
      body: data
    }
  } catch (error) {
    console.error('[AI Proxy] Error:', error.message)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
