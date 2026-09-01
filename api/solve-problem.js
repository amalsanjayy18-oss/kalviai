export default async function handler(req, res) {
  // Only allow POST requests for security
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' })

  const { imageBase64, prompt } = req.body
  const apiKey = process.env.GROQ_API_KEY // Kept strictly on server, never exposed to client[cite: 4]

  if (!apiKey) {
    return res.status(500).json({ error: 'API key not configured on server' })
  }

  try {
    // Calls the high-speed Groq Vision API
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.2-11b-vision-preview',
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
      throw new Error(`Upstream error: ${response.statusText}`)
    }

    const data = await response.json()
    return res.status(200).json({ reply: data.choices[0]?.message?.content || '' })
  } catch (err) {
    return res.status(500).json({ error: err.message })
  }
}