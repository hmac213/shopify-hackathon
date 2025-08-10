import type { Product } from '@shopify/shop-minis-react'

export type HardcodedProduct = Product & { externalUrl?: string }

export const HARDCODED_PRODUCTS: HardcodedProduct[] = [
  {
    id: 'labubu',
    title: 'Labubu',
    vendor: 'Placeholder',
    description: 'Labubu collectible',
    defaultVariantId: 'labubu-variant',
    images: [{ url: 'https://cdn.shopify.com/s/files/1/placeholder/labubu.jpg?v=1' } as any],
    externalUrl: 'https://shop.app/products/8107994906819?variantId=44201302589635',
  } as any,
  {
    id: 'toycar',
    title: 'Toy Car',
    vendor: 'Placeholder',
    description: 'Small toy car',
    defaultVariantId: 'toycar-variant',
    images: [{ url: 'https://cdn.shopify.com/s/files/1/placeholder/toycar.jpg?v=1' } as any],
    externalUrl: 'https://shop.app/products/6943166922839?variantId=40330244882519',
  } as any,
  {
    id: 'truck',
    title: 'Truck',
    vendor: 'Placeholder',
    description: 'Model truck',
    defaultVariantId: 'truck-variant',
    images: [{ url: 'https://cdn.shopify.com/s/files/1/placeholder/truck.jpg?v=1' } as any],
    externalUrl: 'https://shop.app/products/1406362222670?variantId=12521968107598',
  } as any,
  {
    id: 'chair',
    title: 'Chair',
    vendor: 'Placeholder',
    description: 'Modern chair',
    defaultVariantId: 'chair-variant',
    images: [{ url: 'https://cdn.shopify.com/s/files/1/placeholder/chair.jpg?v=1' } as any],
    externalUrl: 'https://shop.app/products/7958550642850?variantId=43400249704610',
  } as any,
]

export function getFirstNHardcoded(n: number): Product[] {
  return HARDCODED_PRODUCTS.slice(0, n) as Product[]
} 