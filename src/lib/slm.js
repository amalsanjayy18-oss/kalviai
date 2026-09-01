import { pipeline, env } from '@huggingface/transformers'

// Optimize environment for local browser execution
env.allowLocalModels = false
env.useBrowserCache = true // Automatically caches model weights in browser IndexedDB

let generatorPromise = null

/**
 * Initializes the on-device Small Language Model (SLM)
 * Runs locally via WebGPU (falling back to WASM/CPU).
 * @param {Function} [onProgress] - Optional callback for download progress
 */
export async function initSLM(onProgress) {
  if (!generatorPromise) {
    generatorPromise = pipeline(
      'text-generation',
      'Xenova/Qwen1.5-0.5B-Chat',
      {
        device: 'webgpu',
        progress_callback: onProgress
      }
    ).catch(err => {
      console.warn('WebGPU not available, falling back to WASM/CPU:', err)
      return pipeline(
        'text-generation',
        'Xenova/Qwen1.5-0.5B-Chat',
        {
          device: 'wasm',
          progress_callback: onProgress
        }
      )
    })
  }
  return generatorPromise
}

/**
 * Executes on-device RAG generation
 * @param {string} userPrompt - The student's question
 * @param {string} contextData - Retrieved syllabus context snippet
 * @param {string} lang - 'en' or 'ta'
 */
export async function generateLocalResponse(userPrompt, contextData, lang) {
  try {
    const generator = await initSLM()

    const systemPrompt = `You are Arivu, a helpful Tamil Nadu State Board tutor. Explain concepts simply using everyday analogies. Answer strictly using this syllabus context: "${contextData}". Always respond in ${lang === 'en' ? 'English' : 'Tamil'}. Keep responses under 3 sentences.`

    const formattedPrompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n<|im_start|>user\n${userPrompt}<|im_end|>\n<|im_start|>assistant\n`

    const result = await generator(formattedPrompt, {
      max_new_tokens: 150,
      temperature: 0.6,
      do_sample: true
    })

    const rawText = result[0]?.generated_text || ''
    const responseText = rawText.split('<|im_start|>assistant\n')[1] || rawText

    return responseText.replace(/<\|im_end\|>/g, '').trim()
  } catch (error) {
    console.error('Local SLM Generation Error:', error)
    return lang === 'en'
      ? `Concept Summary: ${contextData}`
      : `பாடச் சுருக்கம்: ${contextData}`
  }
}