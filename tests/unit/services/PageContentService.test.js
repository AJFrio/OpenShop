import { describe, it, expect, beforeEach } from 'vitest'
import { PageContentService } from '../../../src/services/PageContentService.js'
import { createMockKV } from '../../setup.js'
import { getPageContentKey, sanitizeHtml } from '../../../src/lib/pageContent.js'
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

  it('throws NotFoundError for unknown dynamic pages', async () => {
    await expect(service.getPage('custom-page')).rejects.toMatchObject({
      name: 'NotFoundError',
      statusCode: 404,
    })
  })

  it('creates a dynamic page and lists it', async () => {
    const created = await service.createPage('summer-sale')

    expect(created.slug).toBe('summer-sale')
    expect(created.updatedAt).toBeNull()
    expect(created.data.content).toEqual([])

    const pages = await service.listPages()
    expect(pages.map((entry) => entry.slug)).toEqual(['home', 'about', 'summer-sale'])
    expect(pages.find((entry) => entry.slug === 'summer-sale').createdAt).toBeTruthy()

    const loaded = await service.getPage('summer-sale')
    expect(loaded.slug).toBe('summer-sale')
    expect(loaded.data.content).toEqual([])
  })

  it('rejects duplicate and reserved slugs', async () => {
    await expect(service.createPage('summer-sale')).resolves.toBeTruthy()
    await expect(service.createPage('summer-sale')).rejects.toThrow('already exists')
    await expect(service.createPage('checkout')).rejects.toThrow('Invalid page slug')
    await expect(service.createPage('Invalid Slug')).rejects.toThrow('Invalid page slug')
  })

  it('publishes content to a dynamic page and updates the index', async () => {
    await service.createPage('summer-sale')

    const record = await service.updatePage('summer-sale', {
      content: [
        { type: 'RichTextSection', props: { id: 'x', heading: 'Sale', body: '<p>Details</p>' } },
      ],
      root: { props: {} },
    })

    expect(record.updatedAt).toBeTruthy()

    const fetched = await service.getPage('summer-sale')
    expect(fetched.data.content[0].props.body).toBe('<p>Details</p>')

    const pages = await service.listPages()
    expect(pages.find((entry) => entry.slug === 'summer-sale').updatedAt).toBeTruthy()
  })

  it('deletes dynamic pages but not core pages', async () => {
    await service.createPage('temporary')
    await service.deletePage('temporary')

    await expect(service.getPage('temporary')).rejects.toMatchObject({ name: 'NotFoundError' })
    const pages = await service.listPages()
    expect(pages.map((entry) => entry.slug)).toEqual(['home', 'about'])

    await expect(service.deletePage('home')).rejects.toThrow('Cannot delete core page')
  })
})

describe('root props sanitization', () => {
  it('keeps known root fields and drops unknown ones', async () => {
    const localKv = createMockKV()
    const localService = new PageContentService(localKv)

    const page = await localService.updatePage('home', {
      content: [],
      root: {
        props: {
          title: 'My SEO Title',
          description: 'Meta description here',
          evilProp: '<script>alert(1)</script>',
        },
      },
    })

    expect(page.data.root.props.title).toBe('My SEO Title')
    expect(page.data.root.props.description).toBe('Meta description here')
    expect(page.data.root.props.evilProp).toBeUndefined()
  })
})

describe('sanitizeHtml', () => {
  it('allows basic formatting tags', () => {
    expect(sanitizeHtml('<p>Hello <strong>world</strong></p>')).toBe('<p>Hello <strong>world</strong></p>')
  })

  it('strips script tags and their content', () => {
    expect(sanitizeHtml('<p>safe</p><script>alert(1)</script>')).toBe('<p>safe</p>')
  })

  it('strips style, iframe, object, and embed blocks', () => {
    const input = '<style>.x{}</style><iframe src="https://evil.test"></iframe><object></object><embed>'
    expect(sanitizeHtml(input)).toBe('')
  })

  it('drops disallowed tags including their attributes', () => {
    expect(sanitizeHtml('<img src=x onerror=alert(1)>hello')).toBe('hello')
  })

  it('keeps safe href on anchors', () => {
    expect(sanitizeHtml('<a href="/products">Shop</a>')).toBe('<a href="/products">Shop</a>')
    expect(sanitizeHtml('<a href="https://example.com">Site</a>')).toBe('<a href="https://example.com">Site</a>')
  })

  it('drops unsafe href values on anchors', () => {
    expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
  })

  it('drops non-href attributes', () => {
    expect(sanitizeHtml('<p onclick="alert(1)" class="fancy">x</p>')).toBe('<p>x</p>')
  })

  it('escapes stray angle brackets in text content', () => {
    expect(sanitizeHtml('5 < 6 and 7 > 3')).toBe('5 &lt; 6 and 7 &gt; 3')
  })

  it('returns empty string for non-string input', () => {
    expect(sanitizeHtml(null)).toBe('')
    expect(sanitizeHtml(42)).toBe('')
  })

  it('handles mixed-case dangerous tags', () => {
    expect(sanitizeHtml('<ScRiPt>alert(1)</sCrIpT>')).toBe('')
    expect(sanitizeHtml('<IMG SRC=x ONERROR=alert(1)>hello')).toBe('hello')
  })

  it('rejects backslash protocol-relative URLs', () => {
    expect(sanitizeHtml('<a href="/\\evil.com">x</a>')).toBe('<a>x</a>')
  })

  it('rejects data: and vbscript: hrefs', () => {
    expect(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">x</a>')).toBe('<a>x</a>')
    expect(sanitizeHtml('<a href="vbscript:msgbox(1)">x</a>')).toBe('<a>x</a>')
  })

  it('matches href attributes case-insensitively', () => {
    expect(sanitizeHtml('<a HREF="javascript:alert(1)">x</a>')).toBe('<a>x</a>')
  })

  it('drops unclosed script tags without executing content', () => {
    const result = sanitizeHtml('<script>alert(1)')
    expect(result).not.toContain('<')
    expect(result).toBe('alert(1)')
  })

  it('neutralizes tag reassembly after block removal', () => {
    const result = sanitizeHtml('<scr<script>ipt>alert(1)</script>')
    expect(result).not.toContain('<script')
  })

  it('preserves text-align style on allowed tags only', () => {
    expect(sanitizeHtml('<p style="text-align: center">x</p>')).toBe('<p style="text-align: center">x</p>')
    expect(sanitizeHtml('<p style="color: red; text-align: center">x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<p style="position: fixed">x</p>')).toBe('<p>x</p>')
  })
})
