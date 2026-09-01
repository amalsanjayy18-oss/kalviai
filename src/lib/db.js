import Dexie from 'dexie'
import { encryptLocalData, decryptLocalData } from './crypto.js'

// 1. Initialize the Offline Database
export const db = new Dexie('KalviAIDatabase')

// 2. Define the Schema (Tables)
db.version(1).stores({
  // 'id' is the primary key. We store everything else inside 'encryptedPayload'
  progressStore: 'id, encryptedPayload' 
})

/**
 * Saves user progress or settings securely offline
 * @param {string} id - Unique identifier (e.g., 'lesson_history' or 'user_profile')
 * @param {Object} data - The raw JavaScript object to save
 */
export async function saveSecureData(id, data) {
  try {
    const encrypted = await encryptLocalData(data)
    await db.progressStore.put({ id, encryptedPayload: encrypted })
    console.log(`[Offline DB] Safely stored: ${id}`)
  } catch (error) {
    console.error(`[Offline DB] Failed to save ${id}:`, error)
  }
}

/**
 * Retrieves and decrypts user progress from offline storage
 * @param {string} id - The unique identifier to fetch
 * @returns {Promise<Object|null>} Decrypted object or null if not found
 */
export async function getSecureData(id) {
  try {
    const record = await db.progressStore.get(id)
    if (!record || !record.encryptedPayload) return null
    
    return await decryptLocalData(record.encryptedPayload)
  } catch (error) {
    console.error(`[Offline DB] Failed to retrieve ${id}:`, error)
    return null
  }
}