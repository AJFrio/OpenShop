export function buildCheckoutItems(items) {
  return items
    .filter((item) => item.stripePriceId)
    .map((item) => ({
      priceId: item.stripePriceId,
      quantity: item.quantity ?? 1,
    }))
}
