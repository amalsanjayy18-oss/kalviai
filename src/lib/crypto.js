/**
 * Web Crypto API Utility for AES-GCM 256-bit encryption
 * Protects local student progress and history in IndexedDB.
 */

// Retrieve or generate a persistent local device encryption key
async function getOrCreateEncryptionKey() {
  const STORAGE_KEY = 'kalviai_local_sec_k'
  let rawKey = localStorage.getItem(STORAGE_KEY)

  if (!rawKey) {
    const key = await window.crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    )
    const exported = await window.crypto.subtle.exportKey('jwk', key)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(exported))
    return key
  }

  return await window.crypto.subtle.importKey(
    'jwk',
    JSON.parse(rawKey),
    { name: 'AES-GCM' },
    true,
    ['encrypt', 'decrypt']
  )
}

/**
 * Encrypts any JS object or string before storing in IndexedDB
 * @param {any} data 
 * @returns {Promise<string>} Base64 encrypted payload (IV + Ciphertext)
 */
export async function encryptLocalData(data) {
  try {
    const key = await getOrCreateEncryptionKey()
    const iv = window.crypto.getRandomValues(new Uint8Array(12))
    const encodedData = new TextEncoder().encode(JSON.stringify(data))

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    )

    // Combine IV (12 bytes) + Ciphertext into a single array
    const combined = new Uint8Array(iv.length + cipherBuffer.byteLength)
    combined.set(iv, 0)
    combined.set(new Uint8Array(cipherBuffer), iv.length)

    return btoa(String.fromCharCode(...combined))
  } catch (err) {
    console.error('Encryption failed, using fallback:', err)
    return JSON.stringify(data)
  }
}

/**
 * Decrypts an encrypted Base64 payload read from IndexedDB
 * @param {string} encryptedBase64 
 * @returns {Promise<any>} Original JavaScript object/value
 */
export async function decryptLocalData(encryptedBase64) {
  try {
    if (!encryptedBase64 || typeof encryptedBase64 !== 'string') return null

    // Check if data is plain unencrypted JSON fallback
    if (encryptedBase64.startsWith('{') || encryptedBase64.startsWith('[')) {
      return JSON.parse(encryptedBase64)
    }

    const key = await getOrCreateEncryptionKey()
    const binaryStr = atob(encryptedBase64)
    const bytes = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }

    const iv = bytes.slice(0, 12)
    const cipherData = bytes.slice(12)

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherData
    )

    const decodedStr = new TextDecoder().decode(decryptedBuffer)
    return JSON.parse(decodedStr)
  } catch (err) {
    console.error('Decryption failed:', err)
    return null
  }
}