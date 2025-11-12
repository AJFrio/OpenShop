// Media service - handles media library operations
import { KVManager } from '../lib/kv.js'
import { randomHex } from '../utils/crypto.js'

export class MediaService {
  constructor(kvNamespace) {
    this.kv = new KVManager(kvNamespace)
  }

  /**
   * Generate server ID for media item
   */
  generateServerId() {
    const rnd = randomHex(4)
    const ts = Date.now().toString(36)
    return `${ts}-${rnd}`
  }

  /**
   * Get all media items (sorted by creation date, most recent first)
   */
  async getAllMediaItems() {
    const items = await this.kv.getAllMediaItems()
    return [...items].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
  }

  /**
   * Create media item
   */
  async createMediaItem(itemData) {
    const item = {
      id: itemData.id || this.generateServerId(),
      url: String(itemData.url || ''),
      source: itemData.source || 'link',
      filename: itemData.filename || '',
      mimeType: itemData.mimeType || '',
      driveFileId: itemData.driveFileId || '',
      createdAt: typeof itemData.createdAt === 'number' ? itemData.createdAt : Date.now(),
    }
    return await this.kv.createMediaItem(item)
  }

  /**
   * Delete media item
   */
  async deleteMediaItem(id) {
    await this.kv.deleteMediaItem(id)
  }
}

