import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { Product } from '../types'
import { productPath } from '../lib/productPaths'

type Props = { product: Product }

export default function ProductCard({ product }: Props) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 12, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.985 }}
      className="group overflow-hidden rounded-[22px] border border-slate-200/70 bg-white shadow-sm transition sm:rounded-[28px] sm:hover:-translate-y-1 sm:hover:shadow-soft"
    >
      <Link to={productPath(product)} className="block h-full w-full text-left">
        <div className={`relative aspect-square overflow-hidden ${product.inStock ? 'bg-white' : 'bg-slate-100'}`}>
          <img
            src={product.image}
            alt={product.name}
            loading="lazy"
            className={`h-full w-full object-contain p-2 transition duration-500 sm:p-3 sm:group-hover:scale-[1.035] ${product.inStock ? '' : 'grayscale opacity-45'}`}
          />

          {product.inStock ? (
            <div className="absolute left-2 top-2 rounded-full border border-emerald-100 bg-white/95 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-emerald-700 shadow-sm backdrop-blur sm:left-4 sm:top-4 sm:px-3 sm:text-xs sm:normal-case sm:tracking-normal">
              Disponible
            </div>
          ) : (
            <>
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/25 via-transparent to-transparent" />
              <div className="absolute left-2 top-2 rounded-full bg-sorella-red px-2.5 py-1 text-[9px] font-black uppercase tracking-wide text-white shadow-sm sm:left-4 sm:top-4 sm:px-3 sm:text-xs sm:normal-case sm:tracking-normal">
                Agotado
              </div>
            </>
          )}

          <span className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-base font-black text-sorella-red shadow-md backdrop-blur transition sm:bottom-4 sm:right-4 sm:h-10 sm:w-10 sm:group-hover:translate-x-0.5">→</span>
        </div>

        <div className="flex min-h-[96px] flex-col p-3 sm:min-h-0 sm:p-5">
          <div className="truncate text-[9px] font-black uppercase tracking-[0.18em] text-sorella-blue sm:text-xs sm:tracking-[0.22em]">{product.category}</div>
          <h3 className="mt-1 line-clamp-2 text-[15px] font-black leading-tight tracking-tight text-sorella-ink sm:mt-2 sm:text-2xl">{product.name}</h3>
          {!product.inStock && <div className="mt-auto pt-2 text-[10px] font-bold text-sorella-red sm:text-sm">Pregunta cuándo vuelve</div>}
        </div>
      </Link>
    </motion.article>
  )
}
