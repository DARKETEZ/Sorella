import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Route, Routes, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProductCard from './components/ProductCard'
import ProductPage from './components/ProductPage'
import AdminPanel from './components/AdminPanel'
import AdminLogin from './components/AdminLogin'
import AdminMfa from './components/AdminMfa'
import ProtectedAdminRoute from './components/ProtectedAdminRoute'
import ProtectedMfaRoute from './components/ProtectedMfaRoute'
import Unauthorized from './components/Unauthorized'
import { getPublicProducts } from './lib/catalogApi'
import { trackEvent } from './lib/analytics'
import type { Product } from './types'

function Home() {
  const location = useLocation()
  const [category, setCategory] = useState('Todos')
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    void trackEvent('page_view')
    let active = true

    async function loadCatalog() {
      setLoading(true)
      setError('')

      // En conexiones móviles una primera petición fría puede fallar o tardar
      // más de lo normal. Reintentamos de forma breve antes de mostrar error.
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const data = await getPublicProducts()
          if (!active) return
          setProducts(data)
          setLoading(false)
          return
        } catch (err) {
          console.error(`Error cargando catálogo (intento ${attempt + 1}):`, err)

          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 650 * (attempt + 1)))
            if (!active) return
            continue
          }

          if (active) {
            setError('No pudimos cargar el catálogo en este momento. Revisa tu conexión e intenta nuevamente.')
            setLoading(false)
          }
        }
      }
    }

    void loadCatalog()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (location.hash) {
      requestAnimationFrame(() => document.querySelector(location.hash)?.scrollIntoView({ behavior: 'smooth' }))
    }
  }, [location.hash])

  const categories = ['Todos', ...Array.from(new Set(products.map(product => product.category)))]
  const filtered = useMemo(
    () => category === 'Todos' ? products : products.filter(product => product.category === category),
    [category, products],
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="min-h-screen bg-[#f7f8fa]">
      <Navbar />
      <section className="hero-grid overflow-hidden pt-20 sm:pt-28">
        <div className="mx-auto grid max-w-7xl items-center gap-7 px-4 pb-12 pt-7 sm:gap-10 sm:px-8 sm:pb-16 sm:pt-10 lg:grid-cols-[1.02fr_.98fr] lg:pb-24 lg:pt-16">
          <motion.div initial={{ opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .65, ease: [0.22, 1, 0.36, 1] }}>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black uppercase tracking-[.22em] text-sorella-blue shadow-sm"><span className="h-2 w-2 rounded-full bg-sorella-red" /> Nueva colección</div>
            <h1 className="mt-5 max-w-3xl text-4xl font-black leading-[.96] tracking-[-.05em] text-sorella-ink min-[390px]:text-[2.75rem] sm:mt-6 sm:text-6xl lg:text-7xl">Tu mirada.<br/><span className="text-sorella-red">Tu estilo.</span></h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 sm:mt-6 sm:text-lg sm:leading-8">Descubre nuestros lentes de sol y consulta disponibilidad directamente con Sorella.</p>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:mt-8 sm:flex sm:flex-wrap sm:gap-3"><a href="#catalogo" className="rounded-2xl bg-sorella-red px-4 py-3.5 text-center text-sm font-black text-white shadow-lg shadow-red-200 transition active:scale-[.98] sm:rounded-full sm:px-6 sm:text-base sm:hover:-translate-y-0.5">Ver catálogo</a><a href="#contacto" className="rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-center text-sm font-black text-sorella-ink active:scale-[.98] sm:rounded-full sm:px-6 sm:text-base">Hablar con Sorella</a></div>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: .955, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: .12, duration: .68, ease: [0.22, 1, 0.36, 1] }} className="relative">
            <div className="absolute -left-10 top-10 h-40 w-40 rounded-full bg-sorella-blue/20 blur-3xl" /><div className="absolute -right-8 bottom-4 h-44 w-44 rounded-full bg-sorella-red/15 blur-3xl" />
            <div className="relative overflow-hidden rounded-[28px] bg-white p-2.5 shadow-soft sm:rounded-[38px] sm:p-3"><img src="/products/aurora.svg" alt="Lentes Sorella" className="aspect-[16/11] w-full rounded-[22px] object-contain sm:aspect-[5/4] sm:rounded-[30px]" /><div className="absolute bottom-5 left-5 rounded-2xl bg-white/90 px-4 py-3 shadow-lg backdrop-blur sm:bottom-7 sm:left-7 sm:px-5 sm:py-4"><div className="text-[10px] font-black uppercase tracking-[.22em] text-sorella-blue">Sorella</div><div className="mt-1 text-lg font-black">Diseño que habla por ti.</div></div></div>
          </motion.div>
        </div>
      </section>

      <motion.section id="catalogo" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.08 }} className="mx-auto max-w-7xl px-4 py-12 sm:px-8 sm:py-16 lg:py-24">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><div className="text-xs font-black uppercase tracking-[.24em] text-sorella-blue">Catálogo</div><h2 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Encuentra tu próximo favorito.</h2></div><p className="max-w-md text-slate-500">Abre cualquier modelo para ver sus fotos, detalles y compartir su enlace.</p></div>
        {location.search.includes('producto=no-encontrado') && <div className="mt-8 rounded-2xl bg-amber-50 p-4 font-semibold text-amber-800">Ese producto ya no está disponible o fue ocultado.</div>}
        {error && <div className="mt-8 rounded-2xl bg-red-50 p-4 font-semibold text-red-700">{error}</div>}
        <div className="no-scrollbar -mx-4 mt-6 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:mt-8 sm:flex-wrap sm:overflow-visible sm:px-0">{categories.map(item => <button key={item} onClick={() => setCategory(item)} className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition ${category === item ? 'bg-sorella-ink text-white' : 'border border-slate-200 bg-white text-slate-600 hover:border-sorella-blue'}`}>{item}</button>)}</div>
        {loading ? (
          <div className="mt-8" aria-live="polite" aria-busy="true">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sorella-red" />
              Cargando catálogo…
            </div>
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-[22px] bg-white shadow-sm sm:rounded-[28px]">
                  <div className="aspect-square animate-pulse bg-slate-200" />
                  <div className="space-y-2 p-3 sm:space-y-3 sm:p-5">
                    <div className="h-3 w-24 max-w-full animate-pulse rounded bg-slate-200" />
                    <div className="h-7 w-2/3 animate-pulse rounded bg-slate-200" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : filtered.length > 0 ? (
          <div className="mt-7 grid grid-cols-2 gap-3 sm:mt-8 sm:gap-5 lg:grid-cols-3">
            {filtered.map(product => <ProductCard key={product.id} product={product} />)}
          </div>
        ) : !error ? (
          <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm font-semibold text-slate-500">
            No hay productos disponibles en esta categoría por el momento.
          </div>
        ) : null}
      </motion.section>

      <motion.section id="contacto" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }} transition={{ duration: .5 }} className="px-4 pb-12 sm:px-8 sm:pb-16 lg:pb-24"><div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] bg-sorella-ink px-5 py-8 text-white sm:rounded-[36px] sm:px-10 sm:py-10 lg:flex lg:items-center lg:justify-between lg:px-14 lg:py-14"><div><div className="text-xs font-black uppercase tracking-[.24em] text-sorella-blue">Contacto directo</div><h2 className="mt-3 text-3xl font-black sm:text-4xl">¿Viste un modelo que te encantó?</h2><p className="mt-3 max-w-2xl text-slate-300">Pregúntanos por disponibilidad, colores y entregas por WhatsApp o Instagram.</p></div><div className="mt-6 grid grid-cols-2 gap-2.5 sm:flex sm:gap-3 lg:mt-0"><a href="https://wa.me/50375209639" target="_blank" rel="noopener noreferrer" onClick={() => void trackEvent('whatsapp_click')} className="rounded-2xl bg-sorella-red px-4 py-3.5 text-center text-sm font-black sm:rounded-full sm:px-6 sm:text-base">WhatsApp</a><a href="https://www.instagram.com/sorella_eyewear/" target="_blank" rel="noopener noreferrer" onClick={() => void trackEvent('instagram_click')} className="rounded-2xl border border-white/20 px-4 py-3.5 text-center text-sm font-black sm:rounded-full sm:px-6 sm:text-base">Instagram</a></div></div></motion.section>
      <footer className="border-t border-slate-200 px-4 py-7 text-sm text-slate-500 sm:px-8 sm:py-8"><div className="mx-auto flex max-w-7xl flex-col gap-2 text-center sm:flex-row sm:items-center sm:justify-between sm:text-left"><div><span className="font-black uppercase tracking-[.2em] text-sorella-blue">Sorella</span><span className="text-sorella-red"> · </span><span className="font-light tracking-[.16em] text-sorella-red">Eyewear</span></div><div>Catálogo · Consultas directas por redes</div></div></footer>
    </motion.div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/producto/:productSlug" element={<ProductPage />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/mfa" element={<ProtectedMfaRoute><AdminMfa /></ProtectedMfaRoute>} />
      <Route path="/admin/no-autorizado" element={<Unauthorized />} />
      <Route path="/admin" element={<ProtectedAdminRoute><AdminPanel /></ProtectedAdminRoute>} />
      <Route path="*" element={<Home />} />
    </Routes>
  )
}
