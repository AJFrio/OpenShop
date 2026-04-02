const STOREFRONT_PAGE_KEYS = {
  home: 'home',
  about: 'about',
}

const STOREFRONT_PAGE_OPTIONS = [
  { id: STOREFRONT_PAGE_KEYS.home, label: 'Homepage', path: '/' },
  { id: STOREFRONT_PAGE_KEYS.about, label: 'About Page', path: '/about' },
]

function isValidStorefrontPage(pageId) {
  return Object.prototype.hasOwnProperty.call(STOREFRONT_PAGE_KEYS, pageId)
}

function createDefaultPageRecord(pageId, settings = {}) {
  if (pageId === STOREFRONT_PAGE_KEYS.about) {
    return {
      content: [
        { type: 'SiteHeader', props: {} },
        {
          type: 'HeroBlock',
          props: {
            eyebrow: 'Our Story',
            title: settings.aboutHeroTitle || 'About Us',
            subtitle: settings.aboutHeroSubtitle || 'Learn more about our story and mission',
            imageUrl: settings.aboutHeroImageUrl || '',
            alignment: 'center',
            overlayOpacity: 45,
            minHeight: 420,
            showPrimaryButton: false,
            showSecondaryButton: false,
          },
        },
        {
          type: 'TextBlock',
          props: {
            title: 'Who We Are',
            body: settings.aboutContent || 'Tell your story, mission, and values here.',
            width: 'narrow',
            alignment: 'left',
            background: 'surface',
          },
        },
        { type: 'SiteFooter', props: {} },
      ],
      root: { props: { title: 'About Page' } },
      zones: {},
    }
  }

  return {
    content: [
      { type: 'SiteHeader', props: {} },
      {
        type: 'HeroBlock',
        props: {
          eyebrow: settings.storeName || 'OpenShop',
          title: settings.heroTitle || 'Welcome to OpenShop',
          subtitle: settings.heroSubtitle || 'Discover amazing products at unbeatable prices.',
          imageUrl: settings.heroImageUrl || '',
          primaryButtonLabel: 'Shop Now',
          primaryButtonHref: '#product-grid',
          secondaryButtonLabel: 'Learn More',
          secondaryButtonHref: '/about',
          alignment: 'center',
          overlayOpacity: 35,
          minHeight: 520,
          showPrimaryButton: true,
          showSecondaryButton: true,
        },
      },
      {
        type: 'FeaturedProductsBlock',
        props: {
          title: 'Featured Products',
          subtitle: settings.storeDescription || 'Curated highlights from the catalog.',
          limit: 3,
          mode: 'carousel',
        },
      },
      {
        type: 'CollectionsBlock',
        props: {
          title: 'Shop by Collection',
          subtitle: 'Jump into the parts of the catalog that matter most.',
          limit: 6,
          showDescriptions: true,
        },
      },
      {
        type: 'ProductGridBlock',
        props: {
          anchorId: 'product-grid',
          title: 'All Products',
          subtitle: 'Browse the full catalog.',
          limit: 12,
          source: 'all',
          collectionId: '',
        },
      },
      { type: 'SiteFooter', props: {} },
    ],
    root: { props: { title: 'Homepage' } },
    zones: {},
  }
}

export {
  STOREFRONT_PAGE_KEYS,
  STOREFRONT_PAGE_OPTIONS,
  createDefaultPageRecord,
  isValidStorefrontPage,
}
