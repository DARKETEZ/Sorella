export interface ProductImage {
  id: string
  imageUrl: string
  storagePath: string
  position: number
}

export interface Product {
  id: string
  name: string
  category: string
  description: string
  image: string
  inStock: boolean
  featured: boolean
  visible: boolean
  colors: string[]

  // Galería de imágenes del producto
  images?: ProductImage[]
}

export interface AdminProduct extends Product {
  stock: number
}