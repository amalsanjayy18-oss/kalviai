import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false
env.useBrowserCache = true

let generatorPromise = null

/**
 * Initializes the on-device Small Language Model (SLM)
 * Loads quantized ONNX model compatible with Transformers.js v3+
 */
export async function initSLM(onProgress) {
  if (!generatorPromise) {
    const MODEL_ID = 'onnx-community/Qwen2.5-0.5B-Instruct'

    generatorPromise = pipeline(
      'text-generation', 
      MODEL_ID,
      {
        device: 'webgpu',
        progress_callback: onProgress
      }
    ).catch(err => {
      console.warn("WebGPU unavailable, switching to WASM:", err)
      return pipeline(
        'text-generation', 
        MODEL_ID,
        { 
          device: 'wasm', 
          progress_callback: onProgress 
        }
      )
    })
  }
  return generatorPromise
}

export async function generateLocalResponse(userPrompt, contextData, lang) {
  try {
    const generator = await initSLM()
    
    const messages = [
      { 
        role: "system", 
        content: `You are Arivu, a helpful Tamil Nadu State Board tutor. Explain concepts simply using everyday analogies. Answer strictly using this syllabus context: "${contextData}". Always respond in ${lang === 'en' ? 'English' : 'Tamil'}. Keep responses under 3 sentences.` 
      },
      { role: "user", content: userPrompt }
    ]

    const text = generator.tokenizer.apply_chat_template(messages, {
      tokenize: false,
      add_generation_prompt: true,
    })

    const result = await generator(text, {
      max_new_tokens: 120,
      temperature: 0.6,
      do_sample: true,
      return_full_text: false
    })

    return result[0]?.generated_text?.trim() || (lang === 'en' ? `Summary: ${contextData}` : `சுருக்கம்: ${contextData}`)
  } catch (error) {
    console.error("Local SLM Generation Error:", error)
    return lang === 'en' 
      ? `Concept Summary: ${contextData}` 
      : `பாடச் சுருக்கம்: ${contextData}`
  }
}