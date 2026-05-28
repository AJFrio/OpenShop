import {
  FeaturedProducts,
  HeroSection,
  ImageTextSection,
  ProductGrid,
  RichTextSection,
} from './PageBuilderBlocks'

export function createPageBuilderConfig(options = {}) {
  const {
    products = [],
    collections = [],
    disableNavigation = false,
  } = options

  return {
    components: {
      HeroSection: {
        label: 'Hero section',
        fields: {
          title: { type: 'text' },
          subtitle: { type: 'textarea' },
          imageUrl: { type: 'text' },
          primaryLabel: { type: 'text' },
          primaryPath: { type: 'text' },
          secondaryLabel: { type: 'text' },
          secondaryPath: { type: 'text' },
        },
        defaultProps: {
          title: 'Welcome to OpenShop',
          subtitle: 'Discover amazing products at unbeatable prices.',
          imageUrl: '',
          primaryLabel: 'Shop Now',
          primaryPath: '#products',
          secondaryLabel: 'Learn More',
          secondaryPath: '/about',
        },
        render: (props) => <HeroSection {...props} disableNavigation={disableNavigation} />,
      },
      FeaturedProducts: {
        label: 'Featured products',
        fields: {
          heading: { type: 'text' },
          maxItems: { type: 'number', min: 1, max: 12 },
        },
        defaultProps: {
          heading: 'Featured Products',
          maxItems: 3,
        },
        render: (props) => <FeaturedProducts {...props} products={products} />,
      },
      ProductGrid: {
        label: 'Product grid',
        fields: {
          heading: { type: 'text' },
          showCollectionFilter: {
            type: 'select',
            options: [
              { label: 'Show collection filter', value: true },
              { label: 'Hide collection filter', value: false },
            ],
          },
        },
        defaultProps: {
          heading: 'All Products',
          showCollectionFilter: true,
        },
        render: (props) => (
          <ProductGrid
            {...props}
            products={products}
            collections={collections}
            disableNavigation={disableNavigation}
          />
        ),
      },
      RichTextSection: {
        label: 'Text section',
        fields: {
          heading: { type: 'text' },
          body: { type: 'textarea' },
        },
        defaultProps: {
          heading: 'About this store',
          body: 'Write your content here.',
        },
        render: (props) => <RichTextSection {...props} />,
      },
      ImageTextSection: {
        label: 'Image and text',
        fields: {
          imageUrl: { type: 'text' },
          heading: { type: 'text' },
          body: { type: 'textarea' },
          imageAlign: {
            type: 'select',
            options: [
              { label: 'Image left', value: 'left' },
              { label: 'Image right', value: 'right' },
            ],
          },
        },
        defaultProps: {
          imageUrl: '',
          heading: 'Section heading',
          body: 'Add supporting copy here.',
          imageAlign: 'left',
        },
        render: (props) => <ImageTextSection {...props} />,
      },
    },
    categories: {
      layout: {
        title: 'Layout',
        components: ['HeroSection', 'ImageTextSection', 'RichTextSection'],
      },
      commerce: {
        title: 'Commerce',
        components: ['FeaturedProducts', 'ProductGrid'],
      },
    },
  }
}
