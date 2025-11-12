// Unit tests for StoreSettingsService
import { describe, it, expect, beforeEach } from 'vitest'
import { StoreSettingsService } from '../../../src/services/StoreSettingsService.js'
import { createMockKV } from '../../setup.js'
import { KV_KEYS } from '../../../src/config/index.js'

describe('StoreSettingsService', () => {
  let settingsService
  let mockKV

  beforeEach(() => {
    mockKV = createMockKV()
    settingsService = new StoreSettingsService(mockKV)
  })

  describe('getSettings', () => {
    it('should return default settings when no settings exist', async () => {
      const result = await settingsService.getSettings()

      expect(result).toBeDefined()
      expect(result.logoType).toBe('text')
      expect(result.logoText).toBe('OpenShop')
      expect(result.storeName).toBe('OpenShop')
      expect(result.storeDescription).toBeDefined()
      expect(result.contactEmail).toBeDefined()
    })

    it('should return stored settings when they exist', async () => {
      const customSettings = {
        logoType: 'image',
        logoImageUrl: 'https://example.com/logo.png',
        storeName: 'Custom Store',
        storeDescription: 'Custom description',
        contactEmail: 'custom@example.com'
      }

      await mockKV.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(customSettings))

      const result = await settingsService.getSettings()

      expect(result.storeName).toBe('Custom Store')
      expect(result.logoType).toBe('image')
      expect(result.logoImageUrl).toBe('https://example.com/logo.png')
      expect(result.contactEmail).toBe('custom@example.com')
    })

    it('should merge stored settings with defaults', async () => {
      const partialSettings = {
        storeName: 'Partial Store',
        logoType: 'text' // Required field
      }

      await mockKV.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(partialSettings))

      const result = await settingsService.getSettings()

      expect(result.storeName).toBe('Partial Store')
      // Default values should still be present
      expect(result.logoType).toBe('text')
      expect(result.contactEmail).toBeDefined()
    })
  })

  describe('updateSettings', () => {
    it('should update store settings', async () => {
      const updates = {
        logoType: 'text',
        logoText: 'Updated Store',
        storeName: 'Updated Store Name',
        storeDescription: 'Updated description',
        contactEmail: 'updated@example.com'
      }

      const result = await settingsService.updateSettings(updates)

      expect(result.storeName).toBe('Updated Store Name')
      expect(result.logoText).toBe('Updated Store')
      expect(result.contactEmail).toBe('updated@example.com')

      // Verify settings were stored in KV
      const stored = await mockKV.get(KV_KEYS.STORE_SETTINGS)
      expect(stored).toBeTruthy()
      const parsed = JSON.parse(stored)
      expect(parsed.storeName).toBe('Updated Store Name')
    })

    it('should validate logoType', async () => {
      const invalidSettings = {
        logoType: 'invalid',
        storeName: 'Test Store'
      }

      await expect(
        settingsService.updateSettings(invalidSettings)
      ).rejects.toThrow('Invalid logoType')
    })

    it('should accept text logoType', async () => {
      const settings = {
        logoType: 'text',
        logoText: 'My Store',
        storeName: 'Test Store'
      }

      const result = await settingsService.updateSettings(settings)

      expect(result.logoType).toBe('text')
      expect(result.logoText).toBe('My Store')
    })

    it('should accept image logoType', async () => {
      const settings = {
        logoType: 'image',
        logoImageUrl: 'https://example.com/logo.png',
        storeName: 'Test Store'
      }

      const result = await settingsService.updateSettings(settings)

      expect(result.logoType).toBe('image')
      expect(result.logoImageUrl).toBe('https://example.com/logo.png')
    })

    it('should merge with default settings', async () => {
      const partialUpdates = {
        storeName: 'Custom Store',
        logoType: 'text' // Required field
      }

      const result = await settingsService.updateSettings(partialUpdates)

      expect(result.storeName).toBe('Custom Store')
      // Default values should be merged
      expect(result.logoType).toBe('text')
      expect(result.logoText).toBe('OpenShop')
      expect(result.contactEmail).toBeDefined()
    })
  })

  describe('getContactEmail', () => {
    it('should return default contact email when no settings exist', async () => {
      const result = await settingsService.getContactEmail()

      expect(result).toHaveProperty('email')
      expect(result.email).toBe('contact@example.com')
    })

    it('should return contact email from settings', async () => {
      const settings = {
        contactEmail: 'custom@example.com',
        storeName: 'Test Store'
      }

      await mockKV.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(settings))

      const result = await settingsService.getContactEmail()

      expect(result.email).toBe('custom@example.com')
    })

    it('should return default email when contactEmail is not set', async () => {
      const settings = {
        storeName: 'Test Store'
        // contactEmail not set
      }

      await mockKV.put(KV_KEYS.STORE_SETTINGS, JSON.stringify(settings))

      const result = await settingsService.getContactEmail()

      expect(result.email).toBe('contact@example.com')
    })
  })
})


