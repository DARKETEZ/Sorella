import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Link, Navigate, useParams } from 'react-router-dom'
import Navbar from './Navbar'
import { getPublicProductById } from '../lib/catalogApi'
import { productIdFromParam } from '../lib/productPaths'
import { trackEvent } from '../lib/analytics'
import type { Product } from '../types'

const WHATSAPP_NUMBER = '50375209639'
const INSTAGRAM_URL = 'https://www.instagram.com/sorella_eyewear/'

export default function ProductPage() {
  const { productSlug } = useParams()
  const productId = productIdFromParam(productSlug)
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [activeImage, setActiveImage] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!productId) {
      setNotFound(true)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    getPublicProductById(productId)
      .then(data => {
        if (!active) return
        if (!data) {
          setNotFound(true)
          return
        }
        setProduct(data)
        setActiveImage(data.images?.[0]?.imageUrl || data.image)
        void trackEvent('page_view')
        void trackEvent('product_view', data.id)
      })
      .catch(() => {
        if (active) setError('No pudimos cargar este modelo en este momento.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => { active = false }
  }, [productId])

  useEffect(() => {
    if (!product) return
    const previousTitle = document.title
    const description = document.querySelector('meta[name="description"]')
    const previousDescription = description?.getAttribute('content') ?? ''
    document.title = `${product.name} — Sorella Eyewear`
    description?.setAttribute('content', `${product.name}: ${product.description.slice(0, 140)}`)
    return () => {
      document.title = previousTitle
      description?.setAttribute('content', previousDescription)
    }
  }, [product])

  const gallery = useMemo(() => {
    if (!product) return []
    const images = product.images?.map(image => image.imageUrl).filter(Boolean) ?? []
    return images.length > 0 ? images : [product.image]
  }, [product])

  if (notFound) return <Navigate to="/?producto=no-encontrado" replace />

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <Navbar />
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-8 sm:pt-32">
          <div className="grid animate-pulse gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="aspect-square rounded-[28px] bg-slate-200 sm:rounded-[36px]" />
            <div className="space-y-5 py-3 sm:py-8"><div className="h-4 w-28 rounded bg-slate-200"/><div className="h-10 w-2/3 rounded bg-slate-200"/><div className="h-24 rounded bg-slate-200"/></div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-[#f7f8fa]">
        <Navbar />
        <div className="mx-auto max-w-2xl px-4 pt-28 text-center sm:px-5 sm:pt-36">
          <h1 className="text-3xl font-black">No pudimos abrir el producto.</h1>
          <p className="mt-3 text-slate-500">{error}</p>
          <Link to="/#catalogo" className="mt-6 inline-flex rounded-full bg-sorella-red px-6 py-3 font-black text-white">Volver al catálogo</Link>
        </div>
      </div>
    )
  }

  const message = product.inStock
    ? `Hola Sorella 👋 Me interesa el modelo ${product.name}. ¿Me pueden dar más información sobre disponibilidad? ${window.location.href}`
    : `Hola Sorella 👋 Me interesa el modelo ${product.name}, pero veo que está agotado. ¿Me pueden avisar cuando vuelva a estar disponible? ${window.location.href}`
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa] pb-24 sm:pb-0">
      <Navbar />
      <motion.main
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="mx-auto max-w-7xl px-0 pb-10 pt-16 sm:px-8 sm:pb-20 sm:pt-28 lg:pb-28 lg:pt-32"
      >
        <div className="px-4 pt-4 sm:px-0 sm:pt-0">
          <Link to="/#catalogo" className="inline-flex items-center gap-2 text-sm font-black text-slate-500 transition active:text-sorella-red sm:hover:text-sorella-red">← Volver al catálogo</Link>
        </div>

        <div className="mt-4 grid gap-0 sm:mt-6 sm:gap-8 lg:grid-cols-[1.06fr_.94fr] lg:gap-12">
          <section className="px-0 sm:px-0">
            <div className={`relative overflow-hidden bg-white sm:rounded-[36px] sm:border sm:border-slate-200/70 sm:shadow-soft ${!product.inStock ? 'bg-slate-100' : ''}`}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={activeImage}
                  src={activeImage}
                  alt={product.name}
                  initial={{ opacity: 0.35, scale: 1.01 }}
                  animate={{ opacity: product.inStock ? 1 : 0.55, scale: 1 }}
                  exit={{ opacity: 0.2 }}
                  transition={{ duration: 0.25 }}
                  className={`aspect-square w-full object-contain p-2 sm:p-3 ${!product.inStock ? 'grayscale' : ''}`}
                />
              </AnimatePresence>

              {!product.inStock && (
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-slate-950/45 via-transparent to-transparent p-4 sm:p-8">
                  <div className="max-w-md rounded-2xl border border-white/20 bg-white/92 px-4 py-3 backdrop-blur-xl sm:px-5 sm:py-4">
                    <div className="text-[10px] font-black uppercase tracking-[.2em] text-sorella-red sm:text-xs">Temporalmente agotado</div>
                    <div className="mt-1 text-sm font-black text-sorella-ink sm:text-base">Puedes escribirnos para preguntar cuándo regresa.</div>
                  </div>
                </div>
              )}
            </div>

            {gallery.length > 1 && (
              <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-2 pt-3 sm:px-0 sm:pt-4">
                {gallery.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImage(image)}
                    aria-label={`Ver foto ${index + 1} de ${product.name}`}
                    className={`shrink-0 overflow-hidden rounded-xl border-2 bg-white transition sm:rounded-2xl ${activeImage === image ? 'border-sorella-red shadow-sm' : 'border-transparent sm:hover:border-sorella-blue/60'}`}
                  >
                    <img src={image} alt="" className={`h-16 w-16 object-contain p-1 sm:h-20 sm:w-24 sm:p-1.5 ${!product.inStock ? 'grayscale opacity-70' : ''}`} />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col justify-center px-4 pb-4 pt-6 sm:px-0 sm:pt-0 lg:py-7">
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              <div className="text-[10px] font-black uppercase tracking-[.24em] text-sorella-blue sm:text-xs sm:tracking-[.26em]">{product.category}</div>
              <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide sm:px-3 sm:text-xs sm:normal-case sm:tracking-normal ${product.inStock ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-sorella-red'}`}>
                {product.inStock ? 'Disponible' : 'Agotado'}
              </span>
            </div>

            <h1 className="mt-3 text-3xl font-black tracking-[-.04em] text-sorella-ink min-[390px]:text-4xl sm:mt-4 sm:text-6xl">{product.name}</h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">{product.description}</p>

            {product.colors.length > 0 && (
              <div className="mt-6 sm:mt-7">
                <div className="text-[10px] font-black uppercase tracking-[.2em] text-slate-400 sm:text-xs">Colores</div>
                <div className="mt-2.5 flex flex-wrap gap-2 sm:mt-3">
                  {product.colors.map(color => <span key={color} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 sm:px-4 sm:py-2 sm:text-sm">{color}</span>)}
                </div>
              </div>
            )}

            <div className={`mt-6 rounded-[22px] border p-4 sm:mt-8 sm:rounded-[28px] sm:p-5 ${product.inStock ? 'border-slate-200 bg-white' : 'border-red-100 bg-red-50/70'}`}>
              <div className="font-black text-sorella-ink">{product.inStock ? '¿Te interesa este modelo?' : '¿Quieres saber cuándo vuelve?'}</div>
              <p className="mt-1 text-sm leading-6 text-slate-600">Escríbenos directamente. El mensaje llevará el nombre y enlace de este modelo.</p>
            </div>

            <div className="mt-4 hidden gap-3 sm:grid sm:grid-cols-2">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void trackEvent('whatsapp_click', product.id)}
                className="rounded-2xl bg-sorella-red px-5 py-4 text-center font-black text-white shadow-lg shadow-red-100 transition hover:-translate-y-0.5 hover:brightness-95"
              >
                {product.inStock ? 'Preguntar por WhatsApp' : 'Preguntar cuándo vuelve'}
              </a>
              <a
                href={INSTAGRAM_URL}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => void trackEvent('instagram_click', product.id)}
                className="rounded-2xl border border-slate-300 bg-white px-5 py-4 text-center font-black text-sorella-ink transition hover:border-sorella-blue"
              >
                Instagram
              </a>
            </div>

            <button type="button" onClick={() => void copyLink()} className="mt-3 rounded-2xl px-5 py-3 text-sm font-bold text-slate-500 transition active:bg-white active:text-sorella-red sm:hover:bg-white sm:hover:text-sorella-red">
              {copied ? '✓ Enlace copiado' : 'Compartir / copiar enlace'}
            </button>
          </section>
        </div>
      </motion.main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200/80 bg-white/95 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 shadow-[0_-12px_36px_rgba(15,23,42,.10)] backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-[1fr_auto] gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void trackEvent('whatsapp_click', product.id)}
            className="rounded-2xl bg-sorella-red px-4 py-3.5 text-center text-sm font-black text-white active:scale-[.99]"
          >
            {product.inStock ? 'Preguntar por WhatsApp' : 'Preguntar cuándo vuelve'}
          </a>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => void trackEvent('instagram_click', product.id)}
            aria-label="Abrir Instagram"
            className="flex min-w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-sorella-ink active:bg-slate-50"
          >
            IG
          </a>
        </div>
      </div>
    </div>
  )
}
