import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import type { Product } from '../types'

const WHATSAPP_NUMBER = '50375209639'
const INSTAGRAM_URL = 'https://www.instagram.com/sorella_eyewear/'

type Props = { product: Product | null; onClose: () => void }

export default function ProductModal({ product, onClose }: Props) {
  const gallery = useMemo(() => {
    if (!product) return []
    const images = product.images?.map(image => image.imageUrl).filter(Boolean) ?? []
    return images.length > 0 ? images : [product.image]
  }, [product])
  const [activeImage, setActiveImage] = useState('')

  useEffect(() => {
    if (product) setActiveImage(gallery[0] || product.image)
  }, [product, gallery])

  const whatsappHref = product
    ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola Sorella 👋 Me interesa el modelo ${product.name}. ¿Me pueden dar más información?`)}`
    : '#'

  return (
    <AnimatePresence>
      {product && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 230, damping: 24 }}
            onClick={event => event.stopPropagation()}
            className="min-h-[100dvh] w-full overflow-y-auto bg-white pb-24 shadow-2xl sm:min-h-0 sm:max-h-[92vh] sm:max-w-4xl sm:rounded-[32px] sm:pb-0"
          >
            <div className="grid md:grid-cols-2">
              <div>
                <div className="relative bg-white pt-14 sm:pt-0">
                  <img src={activeImage || product.image} alt={product.name} className={`aspect-square w-full object-contain p-2 ${product.inStock ? '' : 'grayscale opacity-50'}`} />
                  {!product.inStock && <span className="absolute left-4 top-16 rounded-full bg-sorella-red px-3 py-1 text-xs font-black text-white sm:top-4">Agotado</span>}
                </div>
                {gallery.length > 1 && (
                  <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-3">
                    {gallery.map((image, index) => (
                      <button key={`${image}-${index}`} type="button" onClick={() => setActiveImage(image)} className={`shrink-0 rounded-xl border-2 bg-white ${activeImage === image ? 'border-sorella-red' : 'border-transparent'}`}>
                        <img src={image} alt="" className="h-16 w-16 object-contain p-1" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="relative p-5 sm:p-9">
                <button onClick={onClose} className="fixed right-4 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/95 text-xl font-bold shadow-md backdrop-blur sm:absolute sm:right-5 sm:top-5 sm:bg-slate-100 sm:shadow-none">×</button>
                <div className="text-[10px] font-black uppercase tracking-[0.24em] text-sorella-blue sm:text-xs">{product.category}</div>
                <h2 className="mt-2 text-3xl font-black tracking-tight text-sorella-ink sm:mt-3 sm:text-4xl">{product.name}</h2>
                <p className="mt-4 leading-7 text-slate-600">{product.description}</p>
                <div className="mt-5 flex flex-wrap gap-2">{product.colors.map(color => <span key={color} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 sm:text-sm">{color}</span>)}</div>
                <div className="mt-6 rounded-2xl border border-slate-200 bg-sorella-mist p-4">
                  <div className="font-bold text-sorella-ink">{product.inStock ? '¿Te interesa este modelo?' : '¿Quieres saber cuándo vuelve?'}</div>
                  <p className="mt-1 text-sm leading-6 text-slate-600">Escríbenos y te ayudamos con disponibilidad, colores y entrega.</p>
                </div>
                <div className="mt-5 hidden gap-3 sm:grid sm:grid-cols-2">
                  <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-sorella-red px-5 py-3.5 text-center font-black text-white">WhatsApp</a>
                  <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-center font-black text-sorella-ink">Instagram</a>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:hidden">
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-sorella-red px-4 py-3.5 text-center text-sm font-black text-white">{product.inStock ? 'Preguntar por WhatsApp' : 'Preguntar cuándo vuelve'}</a>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex min-w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black">IG</a>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
