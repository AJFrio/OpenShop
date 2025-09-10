export const mockCollections = [
  { id: 'col-1', name: 'Accessories' },
  { id: 'col-2', name: 'Apparel' }
]

export const mockProducts = [
  {
    id: 'prod-1',
    name: 'Stylish Hat',
    tagline: 'Keep it cool',
    price: 29.99,
    currency: 'USD',
    images: ['https://via.placeholder.com/400x300'],
    collectionId: 'col-1',
    stripePriceId: ''
  },
  {
    id: 'prod-2',
    name: 'Comfy Hoodie',
    tagline: 'Cozy up',
    price: 59.99,
    currency: 'USD',
    images: ['https://via.placeholder.com/400x300'],
    collectionId: 'col-2',
    stripePriceId: ''
  },
  {
    id: 'prod-3',
    name: 'Running Sneakers',
    tagline: 'Run in style',
    price: 89.99,
    currency: 'USD',
    images: ['https://via.placeholder.com/400x300'],
    collectionId: 'col-2',
    stripePriceId: ''
  }
]
