import type { Product } from '../types'

export function slugifyProductName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'producto'
}

export function productPath(product: Pick<Product, 'id' | 'name'>): string {
  return `/producto/${slugifyProductName(product.name)}--${product.id}`
}

export function productIdFromParam(param?: string): string | null {
  if (!param) return null
  const marker = param.lastIndexOf('--')
  if (marker < 0) return null
  const id = param.slice(marker + 2)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ? id
    : null
}
