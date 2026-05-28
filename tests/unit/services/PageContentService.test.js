import { describe, it, expect, beforeEach } from 'vitest'
import { PageContentService } from '../../../src/services/PageContentService.js'
import { createMockKV } from '../../setup.js'
import { getPageContentKey } from '../../../src/lib/pageContent.js'
import { KV_KEYS } from '../../../src/config/index.js'

describe('PageContentService', () => {
  let service
  let kv

  beforeEach(() => {
    kv = createMockKV()
    service = new PageContentService(kv)
  })

  it('returns default home data derived from store settings', async () => {
    await kv.put(KV_KEYS.STORE_SETTINGS, JSON.stringify({
      logoType: 'text',
      heroTitle: 'Custom home',
      heroSubtitle: 'Custom subtitle',
      heroImageUrl: 'https://example.com/hero.jpg',
    }))

    const page = await service.getPage('home')

    expect(page.slug).toBe('home')
    expect(page.updatedAt).toBeNull()
    expect(page.data.content[0].type).toBe('HeroSection')
    expect(page.data.content[0].props.title).toBe('Custom home')
    expect(page.data.content[0].props.imageUrl).toBe('https://example.com/hero.jpg')
  })

  it('returns stored page data', async () => {
    const stored = {
      slug: 'about',
      version: 1,
      updatedAt: '2026-05-28T00:00:00.000Z',
      data: {
        content: [
          {
            type: 'RichTextSection',
            props: {
              id: 'custom',
              heading: 'Story',
              body: 'Body',
            },
          },
        ],
        root: { props: {} },
      },
    }
    await kv.put(getPageContentKey('about'), JSON.stringify(stored))

    const page = await service.getPage('about')

    expect(page).toEqual(stored)
  })

  it('rejects invalid slugs', async () => {
    await expect(service.getPage('checkout')).rejects.toThrow('Invalid page slug')
  })

  it('rejects invalid page data shape', async () => {
    await expect(service.updatePage('home', { content: 'invalid', root: {} })).rejects.toThrow('content array')
  })

  it('rejects unsupported components', async () => {
    await expect(service.updatePage('home', {
      content: [
        {
          type: 'ScriptBlock',
          props: { id: 'script', body: '<script>alert(1)</script>' },
        },
      ],
      root: { props: {} },
    })).rejects.toThrow('Unsupported page component')
  })

  it('stores valid page data', async () => {
    const page = await service.updatePage('home', {
      content: [
        {
          type: 'HeroSection',
          props: {
            id: 'hero',
            title: 'New title',
            subtitle: 'New subtitle',
            imageUrl: '/hero.jpg',
            primaryLabel: 'Shop',
            primaryPath: '#products',
            secondaryLabel: 'About',
            secondaryPath: '/about',
          },
        },
      ],
      root: { props: {} },
    })

    expect(page.updatedAt).toBeTruthy()
    expect(page.data.content[0].props.title).toBe('New title')
    expect(await kv.get(getPageContentKey('home'))).toBeTruthy()
  })
})
