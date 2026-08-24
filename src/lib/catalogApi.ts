import { seedProducts } from '../data/seedProducts'
import type { AdminProduct, Product, ProductImage } from '../types'
import { isSupabaseConfigured, supabase } from './supabase'

const BUCKET = 'product-images'
const MAX_IMAGES = 8
const MAX_IMAGE_SIZE = 5 * 1024 * 1024

function imagesFromRow(row: any): ProductImage[] {
  if (!Array.isArray(row.product_images)) return []

  return row.product_images
    .map((image: any) => ({
      id: image.id,
      imageUrl: image.image_url,
      storagePath: image.storage_path,
      position: Number(image.position ?? 0),
    }))
    .sort((a: ProductImage, b: ProductImage) => a.position - b.position)
}

function productFromRow(row: any): Product {
  const images = imagesFromRow(row)

  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,

    // Seguimos conservando image para no romper el catálogo actual.
    image:
      row.image_url ||
      images[0]?.imageUrl ||
      '/products/noir.svg',

    images,

    inStock: row.in_stock,
    featured: row.featured,
    visible: row.visible,
    colors: Array.isArray(row.colors) ? row.colors : [],
  }
}

export async function getPublicProducts(): Promise<Product[]> {
  if (!isSupabaseConfigured || !supabase) {
    return seedProducts.map(({ stock: _stock, ...product }) => ({
      ...product,
      inStock: _stock > 0,
      images: [],
    }))
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      category,
      description,
      image_url,
      in_stock,
      featured,
      visible,
      colors,
      product_images (
        id,
        image_url,
        storage_path,
        position
      )
    `)
    .eq('visible', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(productFromRow)
}


export async function getPublicProductById(productId: string): Promise<Product | null> {
  if (!isSupabaseConfigured || !supabase) {
    const product = seedProducts.find(item => item.id === productId)
    if (!product) return null
    const { stock, ...rest } = product
    return { ...rest, inStock: stock > 0, images: [] }
  }

  const { data, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      category,
      description,
      image_url,
      in_stock,
      featured,
      visible,
      colors,
      product_images (
        id,
        image_url,
        storage_path,
        position
      )
    `)
    .eq('id', productId)
    .eq('visible', true)
    .maybeSingle()

  if (error) throw error
  return data ? productFromRow(data) : null
}

export async function getAdminProducts(): Promise<AdminProduct[]> {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select(`
      id,
      name,
      category,
      description,
      image_url,
      in_stock,
      featured,
      visible,
      colors,
      created_at,
      product_images (
        id,
        image_url,
        storage_path,
        position
      )
    `)
    .order('created_at', { ascending: false })

  if (productsError) throw productsError

  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory')
    .select('product_id,stock')

  if (inventoryError) throw inventoryError

  const stockById = new Map(
    (inventory ?? []).map((item: any) => [
      item.product_id,
      item.stock,
    ])
  )

  return (products ?? []).map((row: any) => ({
    ...productFromRow(row),
    stock: Number(stockById.get(row.id) ?? 0),
  }))
}

export async function saveAdminProduct(
  product: AdminProduct,
  isNew: boolean
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  const payload = {
    id: product.id,
    name: product.name.trim(),
    category: product.category.trim(),
    description: product.description.trim(),
    image_url: product.image,
    featured: product.featured,
    visible: product.visible,
    colors: product.colors,
  }

  if (isNew) {
    const { error } = await supabase
      .from('products')
      .insert(payload)

    if (error) throw error

    const { error: stockError } = await supabase
      .from('inventory')
      .insert({
        product_id: product.id,
        stock: product.stock,
      })

    if (stockError) throw stockError
  } else {
    const { error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', product.id)

    if (error) throw error

    const { error: stockError } = await supabase
      .from('inventory')
      .upsert(
        {
          product_id: product.id,
          stock: product.stock,
        },
        {
          onConflict: 'product_id',
        }
      )

    if (stockError) throw stockError
  }
}

export async function updateStock(
  productId: string,
  stock: number
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  const safeStock = Math.max(0, Math.trunc(stock))

  const { error } = await supabase
    .from('inventory')
    .upsert(
      {
        product_id: productId,
        stock: safeStock,
      },
      {
        onConflict: 'product_id',
      }
    )

  if (error) throw error
}

function validateImage(file: File) {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
  ]

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `"${file.name}" no es una imagen permitida. Usa JPG, PNG, WebP o AVIF.`
    )
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      `"${file.name}" pesa más de 5 MB.`
    )
  }
}

export async function uploadProductImages(
  files: File[],
  productId: string
): Promise<ProductImage[]> {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  if (files.length === 0) {
    return []
  }

  if (files.length > MAX_IMAGES) {
    throw new Error(
      `Puedes subir un máximo de ${MAX_IMAGES} imágenes por vez.`
    )
  }

  files.forEach(validateImage)

  // Obtenemos la última posición para no repetir posiciones
  // cuando estamos editando un producto existente.
  const { data: existingImages, error: existingError } = await supabase
    .from('product_images')
    .select('position')
    .eq('product_id', productId)
    .order('position', { ascending: false })
    .limit(1)

  if (existingError) throw existingError

  const startingPosition =
    existingImages && existingImages.length > 0
      ? Number(existingImages[0].position) + 1
      : 0

  const uploaded: {
    product_id: string
    image_url: string
    storage_path: string
    position: number
  }[] = []

  const uploadedPaths: string[] = []

  try {
    for (let index = 0; index < files.length; index++) {
      const file = files[index]

      const extension = (
        file.name.split('.').pop() || 'jpg'
      )
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')

      const storagePath =
        `${productId}/${crypto.randomUUID()}.${extension || 'jpg'}`

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })

      if (uploadError) {
        throw uploadError
      }

      uploadedPaths.push(storagePath)

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(storagePath)

      uploaded.push({
        product_id: productId,
        image_url: publicUrlData.publicUrl,
        storage_path: storagePath,
        position: startingPosition + index,
      })
    }

    const { data: insertedImages, error: insertError } = await supabase
      .from('product_images')
      .insert(uploaded)
      .select('id,image_url,storage_path,position')

    if (insertError) {
      throw insertError
    }

    // Solo la primera foto histórica queda como portada automáticamente.
    // Al editar y añadir más fotos no cambiamos la portada existente.
    if (uploaded.length > 0 && startingPosition === 0) {
      const { error: coverError } = await supabase
        .from('products')
        .update({
          image_url: uploaded[0].image_url,
        })
        .eq('id', productId)

      if (coverError) {
        throw coverError
      }
    }

    return (insertedImages ?? []).map((image: any) => ({
      id: image.id,
      imageUrl: image.image_url,
      storagePath: image.storage_path,
      position: Number(image.position),
    }))
  } catch (error) {
    // Si algo sale mal antes de guardar correctamente,
    // intentamos eliminar archivos huérfanos de Storage.
    if (uploadedPaths.length > 0) {
      await supabase.storage
        .from(BUCKET)
        .remove(uploadedPaths)
    }

    throw error
  }
}

export async function deleteAdminProduct(
  productId: string
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase no está configurado.')
  }

  // Primero obtenemos las rutas de las fotografías.
  const { data: images } = await supabase
    .from('product_images')
    .select('storage_path')
    .eq('product_id', productId)

  // Eliminamos producto.
  // product_images se elimina automáticamente gracias a ON DELETE CASCADE.
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', productId)

  if (error) throw error

  // Limpiamos también Storage.
  const paths = (images ?? [])
    .map((image: any) => image.storage_path)
    .filter(Boolean)

  if (paths.length > 0) {
    const { error: storageError } = await supabase.storage
      .from(BUCKET)
      .remove(paths)

    if (storageError) {
      console.error(
        'El producto se eliminó, pero algunas imágenes no pudieron eliminarse de Storage:',
        storageError
      )
    }
  }
}