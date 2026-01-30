import { generateSessionToken } from '../utils/crypto.js'

export class R2Service {
  constructor(env) {
    this.env = env
    this.bucket = env.IMAGES
  }

  /**
   * Upload file to R2
   * @param {string} mimeType
   * @param {string} dataBase64
   * @param {string} filename
   */
  async uploadFile(mimeType, dataBase64, filename) {
    if (!this.bucket) {
      throw new Error('R2 bucket not configured')
    }

    // Convert base64 to ArrayBuffer
    const binaryString = atob(dataBase64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Generate a unique key
    // clean filename
    const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const key = `${Date.now()}-${generateSessionToken()}-${safeFilename}`

    await this.bucket.put(key, bytes.buffer, {
      httpMetadata: {
        contentType: mimeType,
      },
    })

    // Use absolute URL if SITE_URL is set, otherwise relative
    // Actually, storing relative path is better for portability, but the frontend expects a full URL sometimes.
    // DriveService returned `https://drive...`.
    // If I return `/api/images/...`, it should work if the frontend uses it as src.
    const viewUrl = `/api/images/${key}`

    // Return structure compatible with previous DriveService but mapped to R2
    return {
      id: key,
      viewUrl: viewUrl,
      downloadUrl: viewUrl,
      webViewLink: viewUrl,
      folder: { id: 'r2', name: 'R2 Bucket' }
    }
  }

  /**
   * Get file from R2
   * @param {string} key
   */
  async getFile(key) {
    if (!this.bucket) {
      throw new Error('R2 bucket not configured')
    }
    return await this.bucket.get(key)
  }
}
