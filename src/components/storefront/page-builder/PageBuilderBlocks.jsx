import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { normalizeImageUrl } from '../../../lib/utils'
import { Carousel } from '../Carousel'
import { ProductCard } from '../ProductCard'

function StorefrontLink({ to, children, variant = 'primary', disableNavigation }) {
  if (!to || !children) return null

  const className = variant === 'primary'
    ? 'storefront-button-primary storefront-radius-sm inline-flex items-center justify-center px-6 py-3 text-sm font-semibold'
    : 'storefront-button-outline storefront-radius-sm inline-flex items-center justify-center px-6 py-3 text-sm font-semibold bg-white'

  if (disableNavigation) {
    return <span className={`${className} cursor-default`}>{children}</span>
  }

  if (to.startsWith('/')) {
    return <Link to={to} className={className}>{children}</Link>
  }

  return <a href={to} className={className}>{children}</a>
}

export function HeroSection({
  title,
  subtitle,
  imageUrl,
  primaryLabel,
  primaryPath,
  secondaryLabel,
  secondaryPath,
  disableNavigation,
}) {
  return (
    <section className="relative w-full overflow-hidden storefront-hero">
      {imageUrl ? (
        <img
          src={normalizeImageUrl(imageUrl)}
          alt=""
          className="block h-[90vh] w-full object-cover"
        />
      ) : (
        <div className="min-h-[320px] w-full sm:min-h-[420px] lg:min-h-[560px]" style={{ backgroundColor: '#1e293b' }} />
      )}

      <div className="absolute inset-0 bg-black/35" aria-hidden />
      <div className="absolute inset-0 flex flex-col items-center justify-center px-4 py-12 text-center text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-6">
          <h1 className="text-4xl font-bold md:text-6xl">{title}</h1>
          {subtitle && <p className="mx-auto max-w-3xl text-xl md:text-2xl">{subtitle}</p>}
          {(primaryLabel || secondaryLabel) && (
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <StorefrontLink to={primaryPath} disableNavigation={disableNavigation}>{primaryLabel}</StorefrontLink>
              <StorefrontLink to={secondaryPath} variant="secondary" disableNavigation={disableNavigation}>{secondaryLabel}</StorefrontLink>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export function FeaturedProducts({ heading, maxItems = 3, products = [] }) {
  const featuredProducts = products.slice(0, Number(maxItems) || 3)

  if (!products.length) return null

  return (
    <section className="mx-auto max-w-8xl px-4 py-16 sm:px-6 lg:px-8">
      {heading && <h2 className="mb-8 text-center text-3xl font-bold storefront-heading">{heading}</h2>}
      <Carousel products={featuredProducts} />
    </section>
  )
}

export function ProductGrid({
  heading,
  showCollectionFilter = true,
  products = [],
  collections = [],
  disableNavigation,
}) {
  const [selectedCollection, setSelectedCollection] = useState(null)
  const collectionFilterEnabled = showCollectionFilter === true || showCollectionFilter === 'true'
  const filteredProducts = useMemo(() => (
    selectedCollection
      ? products.filter((product) => product.collectionId === selectedCollection)
      : products
  ), [products, selectedCollection])

  return (
    <section id="products" className="mx-auto max-w-8xl px-3 pb-16 sm:px-4 lg:px-6">
      {collectionFilterEnabled && collections.length > 0 && (
        <div className="px-1 py-8 sm:px-2">
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              className={`storefront-radius-sm px-4 py-2 text-sm font-medium ${selectedCollection === null ? 'storefront-button-primary' : 'storefront-button-outline'}`}
              onClick={() => setSelectedCollection(null)}
            >
              All Products
            </button>
            {collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                className={`storefront-radius-sm px-4 py-2 text-sm font-medium ${selectedCollection === collection.id ? 'storefront-button-primary' : 'storefront-button-outline'}`}
                onClick={() => setSelectedCollection(collection.id)}
              >
                {collection.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {heading && <h2 className="mb-8 text-center text-3xl font-bold storefront-heading">{heading}</h2>}

      {filteredProducts.length === 0 ? (
        <div className="py-16 text-center">
          <h3 className="mb-2 text-xl font-semibold storefront-heading">No products found</h3>
          <p className="storefront-subtle">
            {selectedCollection ? 'No products in this collection yet.' : 'No products available at the moment.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} disableNavigation={disableNavigation} />
          ))}
        </div>
      )}
    </section>
  )
}

export function RichTextSection({ heading, body }) {
  const paragraphs = String(body || '').split(/\n{2,}/).filter(Boolean)

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="storefront-card storefront-radius bg-white p-8 shadow-sm md:p-12">
        {heading && <h2 className="mb-6 text-3xl font-bold storefront-heading">{heading}</h2>}
        <div className="space-y-6 text-lg leading-relaxed storefront-subtle">
          {paragraphs.map((paragraph, index) => (
            <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  )
}

export function ImageTextSection({ imageUrl, heading, body, imageAlign = 'left' }) {
  const imageFirst = imageAlign !== 'right'

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid items-center gap-10 md:grid-cols-2">
        {imageFirst && <ImagePanel imageUrl={imageUrl} heading={heading} />}
        <div className="space-y-5">
          {heading && <h2 className="text-3xl font-bold storefront-heading">{heading}</h2>}
          <div className="space-y-4 text-lg leading-relaxed storefront-subtle">
            {String(body || '').split(/\n{2,}/).filter(Boolean).map((paragraph, index) => (
              <p key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</p>
            ))}
          </div>
        </div>
        {!imageFirst && <ImagePanel imageUrl={imageUrl} heading={heading} />}
      </div>
    </section>
  )
}

function ImagePanel({ imageUrl, heading }) {
  if (!imageUrl) {
    return <div className="aspect-[4/3] storefront-radius-lg storefront-card-muted" />
  }

  return (
    <img
      src={normalizeImageUrl(imageUrl)}
      alt={heading || ''}
      className="aspect-[4/3] w-full object-cover storefront-radius-lg"
    />
  )
}
