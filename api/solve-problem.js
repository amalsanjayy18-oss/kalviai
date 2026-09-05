export default async function handler(req, res) {
  // Only allow POST requests for security
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const { imageBase64, prompt } = req.body
  const apiKey = process.env.GROQ_API_KEY

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' })
  }
  if (typeof imageBase64 !== 'string' || !imageBase64.startsWith('data:image/')) {
    return res.status(400).json({ error: 'A valid image is required' })
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_VISION_MODEL || 'meta-llama/llama-4-scout-17b-16e-instruct',
        messages: [
          {
            role: 'user',
            content: [
              { type: "text", text: prompt || "Solve this academic problem step-by-step." },
              { type: "image_url", image_url: { url: imageBase64 } }
            ]
          }
        ],
        temperature: 0.4,
        max_tokens: 500,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      throw new Error(`Groq error ${response.status}: ${errorBody || response.statusText}`)
    }

    const data = await response.json()
    return res.status(200).json({ reply: data.choices[0]?.message?.content || '' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}