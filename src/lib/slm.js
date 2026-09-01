import { pipeline, env } from '@huggingface/transformers'

// Optimize environment for local browser execution
env.allowLocalModels = false
env.useBrowserCache = true // Automatically caches model weights in IndexedDB

let generatorPromise = null

/**
 * Initializes the local Small Language Model (SLM)
 * Downloads weights (~135MB) on first run, then loads instantly offline.
 * @param {Function} onProgress - Callback to update loading UI
 */
export async function initSLM(onProgress) {
  if (!generatorPromise) {
    generatorPromise = pipeline(
      'text-generation', 
      'onnx-community/SmolLM2-135M-Instruct',
      {
        device: 'webgpu', // Attempts to use hardware acceleration first
        progress_callback: onProgress
      }
    ).catch(err => {
      console.warn("WebGPU not available, falling back to WASM/CPU:", err)
      // Fallback for older phones or browsers without WebGPU
      return pipeline(
        'text-generation', 
        'onnx-community/SmolLM2-135M-Instruct',
        { device: 'wasm', progress_callback: onProgress }
      )
    })
  }
  return generatorPromise
}

/**
 * Executes the RAG prompt locally offline
 * @param {string} userPrompt - The student's question
 * @param {string} contextData - The syllabus JSON snippet
 * @param {string} lang - 'en' or 'ta'
 */
export async function generateLocalResponse(userPrompt, contextData, lang) {
  try {
    const generator = await initSLM()
    
    // Strict grounded system prompt
    const systemPrompt = `You are Arivu, a helpful Tamil Nadu State Board tutor. Explain concepts using everyday analogies. Answer strictly using this syllabus context: "${contextData}". Answer in ${lang === 'en' ? 'English' : 'Tamil'}. Keep it short and under 3 sentences.`
    
    // Format prompt for SmolLM2 ChatML structure
    const formattedPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`

    const result = await generator(formattedPrompt, {
      max_new_tokens: 150,
      temperature: 0.6,
      do_sample: true,
    })

    // Extract the AI's reply from the formatted output
    const rawText = result[0].generated_text
    const responseText = rawText.split('<|im_start|>assistant\n')[1] || rawText
    
    return responseText.replace(/<\|im_end\|>/g, '').trim()
    
  } catch (error) {
    console.error("Local SLM Generation Error:", error)
    // Absolute fallback if the model fails to load offline
    return lang === 'en' 
      ? `Concept Summary: ${contextData}` 
      : `பாடச் சுருக்கம்: ${contextData}`
  }
}