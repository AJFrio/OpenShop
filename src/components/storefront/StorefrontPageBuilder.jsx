import { createContext, useContext, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Puck, Render } from '@puckeditor/core'
import { Navbar } from './Navbar'
import { Footer } from './Footer'
import { Carousel } from './Carousel'
import { ProductCard } from './ProductCard'
import { Button } from '../ui/button'
import { normalizeImageUrl } from '../../lib/utils'

const StorefrontPageBuilderContext = createContext({
  settings: {},
  products: [],
  collections: [],
  previewMode: false,
})

function useStorefrontPageBuilder() {
  return useContext(StorefrontPageBuilderContext)
}

function StorefrontPageBuilderProvider({ value, children }) {
  const memoized = useMemo(() => ({
    settings: value?.settings || {},
    products: Array.isArray(value?.products) ? value.products : [],
    collections: Array.isArray(value?.collections) ? value.collections : [],
    previewMode: Boolean(value?.previewMode),
  }), [value])

  return (
    <StorefrontPageBuilderContext.Provider value={memoized}>
      {children}
    </StorefrontPageBuilderContext.Provider>
  )
}

function WidthContainer({ width = 'wide', children }) {
  const widthClassName = {
    narrow: 'max-w-3xl',
    medium: 'max-w-5xl',
    wide: 'max-w-7xl',
    full: 'max-w-none',
  }[width] || 'max-w-7xl'

  return (
    <div className={`${widthClassName} mx-auto px-4 sm:px-6 lg:px-8`}>
      {children}
    </div>
  )
}

function SectionHeading({ title, subtitle, alignment = 'center' }) {
  if (!title && !subtitle) return null

  const alignmentClassName = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment] || 'text-center'

  return (
    <div className={`mb-10 space-y-3 ${alignmentClassName}`}>
      {title ? <h2 className="text-3xl font-bold storefront-heading">{title}</h2> : null}
      {subtitle ? <p className="text-base storefront-subtle max-w-3xl mx-auto">{subtitle}</p> : null}
    </div>
  )
}

function BuilderLink({ href, className, children }) {
  const { previewMode } = useStorefrontPageBuilder()

  if (!href) {
    return <span className={className}>{children}</span>
  }

  if (previewMode || href.startsWith('#')) {
    return (
      <a
        href={href}
        className={className}
        onClick={(event) => event.preventDefault()}
      >
        {children}
      </a>
    )
  }

  if (href.startsWith('/')) {
    return <Link to={href} className={className}>{children}</Link>
  }

  return (
    <a href={href} className={className} target="_blank" rel="noreferrer">
      {children}
    </a>
  )
}

function asBoolean(value, fallback = false) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    if (value === 'true') return true
    if (value === 'false') return false
  }
  return fallback
}

function SiteHeaderBlock() {
  const { settings, previewMode } = useStorefrontPageBuilder()
  return <Navbar previewSettings={settings} disableNavigation={previewMode} />
}

function SiteFooterBlock() {
  const { settings } = useStorefrontPageBuilder()
  return <Footer previewSettings={settings} />
}

function HeroBlock(props) {
  const {
    eyebrow,
    title,
    subtitle,
    imageUrl,
    primaryButtonLabel,
    primaryButtonHref,
    secondaryButtonLabel,
    secondaryButtonHref,
    showPrimaryButton,
    showSecondaryButton,
    alignment = 'center',
    overlayOpacity = 35,
    minHeight = 520,
  } = props
  const showPrimary = asBoolean(showPrimaryButton, true)
  const showSecondary = asBoolean(showSecondaryButton, true)

  const alignmentClassName = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  }[alignment] || 'items-center text-center'

  return (
    <section className="relative w-full overflow-hidden storefront-hero">
      {imageUrl ? (
        <img
          src={normalizeImageUrl(imageUrl)}
          alt={title || 'Hero'}
          className="w-full object-cover block"
          style={{ minHeight: `${minHeight}px`, maxHeight: '90vh' }}
        />
      ) : (
        <div
          className="w-full"
          style={{
            minHeight: `${minHeight}px`,
            background: 'linear-gradient(135deg, var(--storefront-color-secondary), var(--storefront-color-primary))',
          }}
        />
      )}

      <div className="absolute inset-0" style={{ backgroundColor: `rgba(0, 0, 0, ${Math.min(Math.max(overlayOpacity, 0), 90) / 100})` }} aria-hidden />

      <div className={`absolute inset-0 flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-12 text-white ${alignmentClassName}`}>
        <div className="max-w-4xl space-y-5">
          {eyebrow ? <p className="text-sm uppercase tracking-[0.35em] opacity-80">{eyebrow}</p> : null}
          {title ? <h1 className="text-4xl md:text-6xl font-bold">{title}</h1> : null}
          {subtitle ? <p className="text-lg md:text-2xl max-w-3xl">{subtitle}</p> : null}
          {(showPrimary || showSecondary) ? (
            <div className={`flex flex-col sm:flex-row gap-4 ${alignment === 'center' ? 'justify-center' : alignment === 'right' ? 'justify-end' : 'justify-start'}`}>
              {showPrimary ? (
                <Button asChild size="lg">
                  <BuilderLink href={primaryButtonHref}>{primaryButtonLabel || 'Learn More'}</BuilderLink>
                </Button>
              ) : null}
              {showSecondary ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white bg-white text-slate-900 hover:bg-slate-100"
                >
                  <BuilderLink href={secondaryButtonHref}>{secondaryButtonLabel || 'Explore'}</BuilderLink>
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function TextBlock({ title, body, alignment = 'left', width = 'narrow', background = 'surface' }) {
  const backgroundClassName = {
    transparent: '',
    surface: 'bg-white storefront-radius-lg shadow-sm',
    muted: 'bg-[var(--storefront-color-accent-soft)]/30 storefront-radius-lg',
  }[background] || 'bg-white storefront-radius-lg shadow-sm'

  const alignmentClassName = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[alignment] || 'text-left'

  return (
    <section className="py-16">
      <WidthContainer width={width}>
        <div className={`p-8 md:p-12 ${backgroundClassName}`}>
          {title ? <h2 className={`text-3xl font-bold storefront-heading mb-6 ${alignmentClassName}`}>{title}</h2> : null}
          <div className={`space-y-5 text-base leading-8 storefront-subtle ${alignmentClassName}`}>
            {(body || '').split('\n\n').filter(Boolean).map((paragraph, index) => (
              <p key={`${title || 'text'}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>
      </WidthContainer>
    </section>
  )
}

function ImageBlock({ imageUrl, altText, caption, width = 'wide' }) {
  if (!imageUrl) return null

  return (
    <section className="py-10">
      <WidthContainer width={width}>
        <figure className="space-y-3">
          <img src={normalizeImageUrl(imageUrl)} alt={altText || caption || 'Storefront image'} className="w-full storefront-radius-lg object-cover" />
          {caption ? <figcaption className="text-sm storefront-subtle text-center">{caption}</figcaption> : null}
        </figure>
      </WidthContainer>
    </section>
  )
}

function CtaBlock({ title, body, buttonLabel, buttonHref, secondaryButtonLabel, secondaryButtonHref, width = 'medium' }) {
  return (
    <section className="py-16">
      <WidthContainer width={width}>
        <div className="storefront-surface-inverse storefront-radius-lg border border-[color:var(--storefront-color-accent-soft)] px-8 py-10 text-center space-y-5">
          {title ? <h2 className="text-3xl font-bold storefront-heading">{title}</h2> : null}
          {body ? <p className="text-base storefront-subtle max-w-2xl mx-auto">{body}</p> : null}
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            {buttonLabel ? (
              <Button asChild>
                <BuilderLink href={buttonHref}>{buttonLabel}</BuilderLink>
              </Button>
            ) : null}
            {secondaryButtonLabel ? (
              <Button asChild variant="outline">
                <BuilderLink href={secondaryButtonHref}>{secondaryButtonLabel}</BuilderLink>
              </Button>
            ) : null}
          </div>
        </div>
      </WidthContainer>
    </section>
  )
}

function FeaturedProductsBlock({ title, subtitle, limit = 3, mode = 'carousel' }) {
  const { products, previewMode } = useStorefrontPageBuilder()
  const featured = products.slice(0, Math.max(1, Number(limit) || 3))

  return (
    <section className="py-16">
      <WidthContainer width="wide">
        <SectionHeading title={title} subtitle={subtitle} />
        {mode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} disableNavigation={previewMode} />
            ))}
          </div>
        ) : (
          <Carousel products={featured} />
        )}
      </WidthContainer>
    </section>
  )
}

function ProductGridBlock({ anchorId, title, subtitle, source = 'all', collectionId = '', limit = 12 }) {
  const { products, previewMode } = useStorefrontPageBuilder()
  const numericLimit = Math.max(1, Number(limit) || 12)
  const filteredProducts = source === 'collection' && collectionId
    ? products.filter((product) => product.collectionId === collectionId)
    : products

  return (
    <section id={anchorId || undefined} className="py-16">
      <WidthContainer width="wide">
        <SectionHeading title={title} subtitle={subtitle} />
        {filteredProducts.length === 0 ? (
          <div className="storefront-surface-inverse storefront-radius-lg border border-dashed border-slate-300 p-10 text-center storefront-subtle">
            No products match this section yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.slice(0, numericLimit).map((product) => (
              <ProductCard key={product.id} product={product} disableNavigation={previewMode} />
            ))}
          </div>
        )}
      </WidthContainer>
    </section>
  )
}

function CollectionsBlock({ title, subtitle, limit = 6, showDescriptions = true }) {
  const { collections, previewMode } = useStorefrontPageBuilder()
  const visibleCollections = collections.slice(0, Math.max(1, Number(limit) || 6))
  const showDescriptionsEnabled = asBoolean(showDescriptions, true)

  return (
    <section className="py-16">
      <WidthContainer width="wide">
        <SectionHeading title={title} subtitle={subtitle} />
        {visibleCollections.length === 0 ? (
          <div className="storefront-surface-inverse storefront-radius-lg border border-dashed border-slate-300 p-10 text-center storefront-subtle">
            Add collections to show them here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visibleCollections.map((collection) => (
              <div key={collection.id} className="storefront-card storefront-radius-lg border border-[color:var(--storefront-color-accent-soft)] p-6 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold storefront-heading">{collection.name}</h3>
                  {showDescriptionsEnabled && collection.description ? (
                    <p className="storefront-subtle">{collection.description}</p>
                  ) : null}
                </div>
                <Button asChild variant="outline">
                  <BuilderLink href={previewMode ? '#' : `/collections/${collection.id}`}>View Collection</BuilderLink>
                </Button>
              </div>
            ))}
          </div>
        )}
      </WidthContainer>
    </section>
  )
}

function SpacerBlock({ height = 64 }) {
  return <div style={{ height: `${Math.max(0, Number(height) || 0)}px` }} aria-hidden />
}

const storefrontPageConfig = {
  root: {
    fields: {
      title: {
        type: 'text',
        label: 'Page name',
      },
    },
  },
  components: {
    SiteHeader: {
      label: 'Site Header',
      fields: {},
      render: SiteHeaderBlock,
    },
    HeroBlock: {
      label: 'Hero',
      defaultProps: {
        eyebrow: 'OpenShop',
        title: 'Build a sharper storefront',
        subtitle: 'Use flexible sections to change the story, hierarchy, and merchandising flow.',
        imageUrl: '',
        primaryButtonLabel: 'Shop Now',
        primaryButtonHref: '#product-grid',
        secondaryButtonLabel: 'About',
        secondaryButtonHref: '/about',
        showPrimaryButton: true,
        showSecondaryButton: true,
        alignment: 'center',
        overlayOpacity: 35,
        minHeight: 520,
      },
      fields: {
        eyebrow: { type: 'text', label: 'Eyebrow' },
        title: { type: 'text', label: 'Title' },
        subtitle: { type: 'textarea', label: 'Subtitle' },
        imageUrl: { type: 'text', label: 'Background image URL' },
        primaryButtonLabel: { type: 'text', label: 'Primary button label' },
        primaryButtonHref: { type: 'text', label: 'Primary button link' },
        secondaryButtonLabel: { type: 'text', label: 'Secondary button label' },
        secondaryButtonHref: { type: 'text', label: 'Secondary button link' },
        showPrimaryButton: {
          type: 'select',
          label: 'Show primary button',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        showSecondaryButton: {
          type: 'select',
          label: 'Show secondary button',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
        alignment: {
          type: 'select',
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
        overlayOpacity: { type: 'number', label: 'Overlay opacity' },
        minHeight: { type: 'number', label: 'Minimum height' },
      },
      render: HeroBlock,
    },
    TextBlock: {
      label: 'Text Section',
      defaultProps: {
        title: 'Section Title',
        body: 'Use this area for longer storytelling, founder notes, or campaign copy.',
        alignment: 'left',
        width: 'narrow',
        background: 'surface',
      },
      fields: {
        title: { type: 'text', label: 'Title' },
        body: { type: 'textarea', label: 'Body' },
        alignment: {
          type: 'select',
          label: 'Alignment',
          options: [
            { label: 'Left', value: 'left' },
            { label: 'Center', value: 'center' },
            { label: 'Right', value: 'right' },
          ],
        },
        width: {
          type: 'select',
          label: 'Content width',
          options: [
            { label: 'Narrow', value: 'narrow' },
            { label: 'Medium', value: 'medium' },
            { label: 'Wide', value: 'wide' },
            { label: 'Full', value: 'full' },
          ],
        },
        background: {
          type: 'select',
          label: 'Background',
          options: [
            { label: 'Surface', value: 'surface' },
            { label: 'Muted', value: 'muted' },
            { label: 'Transparent', value: 'transparent' },
          ],
        },
      },
      render: TextBlock,
    },
    ImageBlock: {
      label: 'Image',
      defaultProps: {
        imageUrl: '',
        altText: '',
        caption: '',
        width: 'wide',
      },
      fields: {
        imageUrl: { type: 'text', label: 'Image URL' },
        altText: { type: 'text', label: 'Alt text' },
        caption: { type: 'text', label: 'Caption' },
        width: {
          type: 'select',
          label: 'Width',
          options: [
            { label: 'Medium', value: 'medium' },
            { label: 'Wide', value: 'wide' },
            { label: 'Full', value: 'full' },
          ],
        },
      },
      render: ImageBlock,
    },
    CtaBlock: {
      label: 'Call To Action',
      defaultProps: {
        title: 'Drive the next action',
        body: 'Use this for a focused campaign push, newsletter signup, or a featured collection.',
        buttonLabel: 'Primary action',
        buttonHref: '/',
        secondaryButtonLabel: 'Secondary action',
        secondaryButtonHref: '/about',
        width: 'medium',
      },
      fields: {
        title: { type: 'text', label: 'Title' },
        body: { type: 'textarea', label: 'Body' },
        buttonLabel: { type: 'text', label: 'Primary button label' },
        buttonHref: { type: 'text', label: 'Primary button link' },
        secondaryButtonLabel: { type: 'text', label: 'Secondary button label' },
        secondaryButtonHref: { type: 'text', label: 'Secondary button link' },
        width: {
          type: 'select',
          label: 'Width',
          options: [
            { label: 'Narrow', value: 'narrow' },
            { label: 'Medium', value: 'medium' },
            { label: 'Wide', value: 'wide' },
          ],
        },
      },
      render: CtaBlock,
    },
    FeaturedProductsBlock: {
      label: 'Featured Products',
      defaultProps: {
        title: 'Featured Products',
        subtitle: 'Highlight a curated slice of the catalog.',
        limit: 3,
        mode: 'carousel',
      },
      fields: {
        title: { type: 'text', label: 'Title' },
        subtitle: { type: 'textarea', label: 'Subtitle' },
        limit: { type: 'number', label: 'Product limit' },
        mode: {
          type: 'select',
          label: 'Display mode',
          options: [
            { label: 'Carousel', value: 'carousel' },
            { label: 'Grid', value: 'grid' },
          ],
        },
      },
      render: FeaturedProductsBlock,
    },
    ProductGridBlock: {
      label: 'Product Grid',
      defaultProps: {
        anchorId: '',
        title: 'Products',
        subtitle: '',
        source: 'all',
        collectionId: '',
        limit: 12,
      },
      fields: {
        anchorId: { type: 'text', label: 'Anchor id' },
        title: { type: 'text', label: 'Title' },
        subtitle: { type: 'textarea', label: 'Subtitle' },
        source: {
          type: 'select',
          label: 'Product source',
          options: [
            { label: 'All products', value: 'all' },
            { label: 'Specific collection', value: 'collection' },
          ],
        },
        collectionId: { type: 'text', label: 'Collection id' },
        limit: { type: 'number', label: 'Product limit' },
      },
      render: ProductGridBlock,
    },
    CollectionsBlock: {
      label: 'Collections Grid',
      defaultProps: {
        title: 'Collections',
        subtitle: '',
        limit: 6,
        showDescriptions: true,
      },
      fields: {
        title: { type: 'text', label: 'Title' },
        subtitle: { type: 'textarea', label: 'Subtitle' },
        limit: { type: 'number', label: 'Collection limit' },
        showDescriptions: {
          type: 'select',
          label: 'Show descriptions',
          options: [
            { label: 'Yes', value: true },
            { label: 'No', value: false },
          ],
        },
      },
      render: CollectionsBlock,
    },
    SpacerBlock: {
      label: 'Spacer',
      defaultProps: {
        height: 64,
      },
      fields: {
        height: { type: 'number', label: 'Height' },
      },
      render: SpacerBlock,
    },
    SiteFooter: {
      label: 'Site Footer',
      fields: {},
      render: SiteFooterBlock,
    },
  },
}

function StorefrontPageRender({ data, runtime }) {
  return (
    <StorefrontPageBuilderProvider value={runtime}>
      <Render config={storefrontPageConfig} data={data} />
    </StorefrontPageBuilderProvider>
  )
}

function StorefrontPageEditor({ data, runtime, onPublish, onChange, headerTitle = 'Website Builder', headerPath = '/' }) {
  return (
    <StorefrontPageBuilderProvider value={{ ...runtime, previewMode: true }}>
      <Puck
        config={storefrontPageConfig}
        data={data}
        onPublish={onPublish}
        onChange={onChange}
        headerTitle={headerTitle}
        headerPath={headerPath}
      />
    </StorefrontPageBuilderProvider>
  )
}

export {
  StorefrontPageEditor,
  StorefrontPageRender,
  storefrontPageConfig,
}
