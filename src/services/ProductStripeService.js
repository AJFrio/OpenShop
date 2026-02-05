// Product Stripe integration service - handles complex product creation with variants
import { StripeService } from './StripeService.js'

export class ProductStripeService {
  constructor(stripeService) {
    this.stripe = stripeService
  }

  /**
   * Create Stripe product and prices for a product with variants
   */
  async createProductWithPrices(productData) {
    // Create Stripe product
    const stripeProduct = await this.stripe.createProduct({
      name: productData.name,
      description: productData.description,
      images: Array.isArray(productData.images) 
        ? productData.images 
        : (productData.imageUrl ? [productData.imageUrl] : []),
    })

    const variants = Array.isArray(productData.variants) ? productData.variants : []
    const variants2 = Array.isArray(productData.variants2) ? productData.variants2 : []

    let basePrice = null
    const variantPrices = {}

    if (variants.length === 0 && variants2.length === 0) {
      // No variants - create base price
      basePrice = await this.stripe.createPrice({
        amount: productData.price,
        currency: productData.currency,
        productId: stripeProduct.id,
        nickname: `${productData.name} - Base`,
        metadata: {
          price_type: 'base',
          product_name: productData.name
        }
      })
    } else {
      // Generate all variant combinations
      const combinations = []

      if (variants.length > 0 && variants2.length > 0) {
        // Both variant types - create all combinations
        for (const v1 of variants) {
          for (const v2 of variants2) {
            const comboName = `${productData.name} - ${v1.name} - ${v2.name}`
            const comboPrice = (v1.hasCustomPrice && v1.price) ? v1.price :
                              (v2.hasCustomPrice && v2.price) ? v2.price :
                              productData.price

            combinations.push({
              name: comboName,
              price: comboPrice,
              variant1: v1,
              variant2: v2,
              description: comboName,
              variantCombo: `${v1.id || v1.name}-${v2.id || v2.name}`
            })
          }
        }
      } else if (variants.length > 0) {
        // Only first variant type
        for (const v of variants) {
          const comboName = `${productData.name} - ${v.name}`
          const comboPrice = (v.hasCustomPrice && v.price) ? v.price : productData.price

          combinations.push({
            name: comboName,
            price: comboPrice,
            variant1: v,
            description: comboName,
            variantCombo: `${v.id || v.name}`
          })
        }
      } else if (variants2.length > 0) {
        // Only second variant type
        for (const v of variants2) {
          const comboName = `${productData.name} - ${v.name}`
          const comboPrice = (v.hasCustomPrice && v.price) ? v.price : productData.price

          combinations.push({
            name: comboName,
            price: comboPrice,
            variant2: v,
            description: comboName,
            variantCombo: `${v.id || v.name}`
          })
        }
      }

      // Create Stripe prices for each combination
      for (const combo of combinations) {
        const stripePrice = await this.stripe.createPrice({
          amount: combo.price,
          currency: productData.currency,
          productId: stripeProduct.id,
          nickname: combo.name,
          metadata: {
            price_type: 'variant_combo',
            product_name: productData.name,
            variant1_name: combo.variant1?.name || '',
            variant2_name: combo.variant2?.name || '',
            variant1_id: combo.variant1?.id || '',
            variant2_id: combo.variant2?.id || '',
            variant1_style: productData.variantStyle || 'Variant',
            variant2_style: productData.variantStyle2 || 'Variant',
            variant_combo: combo.variantCombo
          }
        })

        // Store price ID by variant combination for frontend lookup
        if (combo.variant1 && combo.variant2) {
          variantPrices[`${combo.variant1.id}-${combo.variant2.id}`] = stripePrice.id
        } else if (combo.variant1) {
          variantPrices[combo.variant1.id] = stripePrice.id
        } else if (combo.variant2) {
          variantPrices[combo.variant2.id] = stripePrice.id
        }
      }

      // Also create base price for fallback
      basePrice = await this.stripe.createPrice({
        amount: productData.price,
        currency: productData.currency,
        productId: stripeProduct.id,
        nickname: `${productData.name} - Base`,
        metadata: {
          price_type: 'base',
          product_name: productData.name
        }
      })
    }

    return {
      stripeProduct,
      basePrice,
      variantPrices
    }
  }

  /**
   * Update product variants and prices
   */
  async updateProductVariants(existingProduct, updates, stripeService) {
    const baseStripePriceId = updates.stripePriceId || existingProduct.stripePriceId
    const updatedVariants = []
    const updatedVariants2 = []

    // Handle primary variant group
    if (Array.isArray(updates.variants)) {
      const incomingVariants = updates.variants
      const existingVariants = Array.isArray(existingProduct.variants) ? existingProduct.variants : []

      const results = await Promise.all(incomingVariants.map(async (v) => {
        const prior = v.id ? existingVariants.find(ev => ev.id === v.id) : undefined
        const wantsCustom = !!v.hasCustomPrice && typeof v.price === 'number' && v.price > 0

        if (wantsCustom) {
          const desiredUnitAmount = Math.round(v.price * 100)
          let priceIdToUse = prior?.stripePriceId

          const priorWasCustom = !!prior?.hasCustomPrice && typeof prior?.price === 'number'
          const priorAmount = priorWasCustom ? Math.round(prior.price * 100) : null

          if (!priceIdToUse || !priorWasCustom || priorAmount !== desiredUnitAmount) {
            // Create a new price for this variant
            const newVariantPrice = await stripeService.createPrice({
              amount: v.price,
              currency: updates.currency || existingProduct.currency,
              productId: existingProduct.stripeProductId,
              nickname: `${updates.name || existingProduct.name} - ${v.name}`,
              metadata: {
                price_type: 'variant_primary',
                variant_id: v.id || '',
                variant_name: v.name || '',
              }
            })
            // Archive old variant price if it existed and was custom
            if (prior?.stripePriceId && priorWasCustom) {
              try { await stripeService.archivePrice(prior.stripePriceId) } catch (_) {}
            }
            priceIdToUse = newVariantPrice.id
          }

          return { ...v, stripePriceId: priceIdToUse, hasCustomPrice: true }
        } else {
          // No custom price → point to base product price
          if (prior?.stripePriceId && prior?.hasCustomPrice) {
            try { await stripeService.archivePrice(prior.stripePriceId) } catch (_) {}
          }
          return { ...v, stripePriceId: baseStripePriceId, hasCustomPrice: false, price: undefined }
        }
      }))
      updatedVariants.push(...results)
    }

    // Handle secondary variant group
    if (Array.isArray(updates.variants2)) {
      const incomingVariants = updates.variants2
      const existingVariants = Array.isArray(existingProduct.variants2) ? existingProduct.variants2 : []

      const results = await Promise.all(incomingVariants.map(async (v) => {
        const prior = v.id ? existingVariants.find(ev => ev.id === v.id) : undefined
        const wantsCustom = !!v.hasCustomPrice && typeof v.price === 'number' && v.price > 0

        if (wantsCustom) {
          const desiredUnitAmount = Math.round(v.price * 100)
          let priceIdToUse = prior?.stripePriceId

          const priorWasCustom = !!prior?.hasCustomPrice && typeof prior?.price === 'number'
          const priorAmount = priorWasCustom ? Math.round(prior.price * 100) : null

          if (!priceIdToUse || !priorWasCustom || priorAmount !== desiredUnitAmount) {
            const newVariantPrice = await stripeService.createPrice({
              amount: v.price,
              currency: updates.currency || existingProduct.currency,
              productId: existingProduct.stripeProductId,
              nickname: `${updates.name || existingProduct.name}${(updates.variantStyle2 || existingProduct.variantStyle2) ? ` - ${(updates.variantStyle2 || existingProduct.variantStyle2)}: ${v.name}` : ` - ${v.name}`}`,
              metadata: {
                price_type: 'variant_secondary',
                variant_id: v.id || '',
                variant_name: v.name || '',
                variant2_name: v.name || ''
              }
            })
            if (prior?.stripePriceId && priorWasCustom) {
              try { await stripeService.archivePrice(prior.stripePriceId) } catch (_) {}
            }
            priceIdToUse = newVariantPrice.id
          }

          return { ...v, stripePriceId: priceIdToUse, hasCustomPrice: true }
        } else {
          if (prior?.stripePriceId && prior?.hasCustomPrice) {
            try { await stripeService.archivePrice(prior.stripePriceId) } catch (_) {}
          }
          return { ...v, stripePriceId: baseStripePriceId, hasCustomPrice: false, price: undefined }
        }
      }))
      updatedVariants2.push(...results)
    }

    return {
      variants: updatedVariants.length > 0 ? updatedVariants : existingProduct.variants,
      variants2: updatedVariants2.length > 0 ? updatedVariants2 : existingProduct.variants2
    }
  }
}

