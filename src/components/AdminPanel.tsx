import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import type { AdminProduct } from '../types'
import {
  deleteAdminProduct,
  getAdminProducts,
  saveAdminProduct,
  updateStock,
  uploadProductImages,
} from '../lib/catalogApi'
import { getDashboardAnalytics } from '../lib/analytics'
import type { DashboardAnalytics } from '../lib/analytics'
import { productPath } from '../lib/productPaths'
import { useAuth } from '../lib/AuthProvider'

const MAX_IMAGES = 8

const blank = (): AdminProduct => ({
  id: crypto.randomUUID(),
  name: '',
  category: '',
  description: '',
  image: '/products/noir.svg',
  images: [],
  stock: 0,
  inStock: false,
  featured: false,
  visible: true,
  colors: [],
})

const emptyAnalytics = (days: number): DashboardAnalytics => ({
  periodDays: days,
  pageViews: 0,
  uniqueVisitors: 0,
  productViews: 0,
  whatsappClicks: 0,
  instagramClicks: 0,
  todayViews: 0,
  daily: [],
  products: [],
})

export default function AdminPanel() {
  const { user, signOut } = useAuth()
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [editing, setEditing] = useState<AdminProduct | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [search, setSearch] = useState('')
  const [analyticsDays, setAnalyticsDays] = useState(30)
  const [analytics, setAnalytics] = useState<DashboardAnalytics>(() => emptyAnalytics(30))
  const [loading, setLoading] = useState(true)
  const [analyticsLoading, setAnalyticsLoading] = useState(true)
  const [error, setError] = useState('')
  const [analyticsError, setAnalyticsError] = useState('')
  const [notice, setNotice] = useState('')

  async function refreshProducts() {
    setLoading(true)
    setError('')
    try {
      setProducts(await getAdminProducts())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el inventario.')
    } finally {
      setLoading(false)
    }
  }

  async function refreshAnalytics(days = analyticsDays) {
    setAnalyticsLoading(true)
    setAnalyticsError('')
    try {
      setAnalytics(await getDashboardAnalytics(days))
    } catch (err) {
      console.error(err)
      setAnalytics(emptyAnalytics(days))
      setAnalyticsError('No se pudieron cargar las analíticas. Ejecuta supabase/upgrade.sql si todavía no lo has hecho.')
    } finally {
      setAnalyticsLoading(false)
    }
  }

  useEffect(() => { void refreshProducts() }, [])
  useEffect(() => { void refreshAnalytics(analyticsDays) }, [analyticsDays])

  const dashboard = useMemo(() => {
    const totalUnits = products.reduce((total, product) => total + product.stock, 0)
    const lowStock = products
      .filter(product => product.stock > 0 && product.stock <= 3)
      .sort((a, b) => a.stock - b.stock)

    return {
      all: products.length,
      totalUnits,
      available: products.filter(product => product.stock > 0).length,
      out: products.filter(product => product.stock <= 0).length,
      lowStock,
      hidden: products.filter(product => !product.visible).length,
      featured: products.filter(product => product.featured).length,
    }
  }, [products])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return products
    return products.filter(product =>
      [product.name, product.category, product.description, ...product.colors]
        .join(' ')
        .toLowerCase()
        .includes(query)
    )
  }, [products, search])

  async function remove(id: string) {
    if (!confirm('¿Eliminar este producto del catálogo? Esta acción no se puede deshacer.')) return
    setError('')
    setNotice('')
    try {
      await deleteAdminProduct(id)
      setProducts(current => current.filter(product => product.id !== id))
      setNotice('Producto eliminado.')
      void refreshAnalytics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el producto.')
    }
  }

  async function changeStock(product: AdminProduct, raw: string) {
    const stock = Math.max(0, Math.trunc(Number(raw) || 0))
    setProducts(current => current.map(item => item.id === product.id ? { ...item, stock, inStock: stock > 0 } : item))
    try {
      await updateStock(product.id, stock)
      setNotice(`Stock de ${product.name} actualizado.`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el stock.')
      void refreshProducts()
    }
  }

  function openNewProduct() {
    setNotice('')
    setError('')
    setIsNew(true)
    setEditing(blank())
  }

  function openEditProduct(product: AdminProduct) {
    setNotice('')
    setError('')
    setIsNew(false)
    setEditing(product)
  }

  return (
    <motion.main
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: .35 }}
      className="min-h-screen bg-sorella-mist px-4 pb-10 pt-5 sm:p-8"
    >
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-[10px] font-black uppercase tracking-[.22em] text-sorella-blue sm:text-xs sm:tracking-[.24em]">Dashboard protegido</div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 sm:text-[10px]">2FA activo</span>
            </div>
            <h1 className="mt-1 text-2xl font-black sm:text-3xl">Sorella Admin</h1>
            <p className="mt-1 truncate text-xs text-slate-500 sm:text-sm">Sesión: {user?.email}</p>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Link to="/" className="rounded-2xl bg-white px-4 py-2.5 text-center text-sm font-bold shadow-sm transition active:scale-[.98] sm:rounded-full sm:py-2 sm:hover:bg-slate-50">Ver catálogo</Link>
            <button type="button" onClick={() => void signOut()} className="rounded-2xl bg-sorella-ink px-4 py-2.5 text-sm font-bold text-white transition active:scale-[.98] sm:rounded-full sm:py-2 sm:hover:opacity-90">Cerrar sesión</button>
          </div>
        </header>

        {error && <div className="mt-5 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {notice && <div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">{notice}</div>}

        <section className="mt-7">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-sorella-blue sm:text-xs sm:tracking-[.22em]">Resumen</div>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">Actividad del catálogo</h2>
            </div>
            <div className="flex shrink-0 rounded-full bg-white p-1 shadow-sm">
              {[7, 30].map(days => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setAnalyticsDays(days)}
                  className={`rounded-full px-3 py-2 text-[10px] font-black transition sm:px-4 sm:text-xs ${analyticsDays === days ? 'bg-sorella-ink text-white' : 'text-slate-500 hover:text-sorella-red'}`}
                >
                  {days} días
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <DashboardCard label="Visitantes" value={analytics.uniqueVisitors} detail={`Últimos ${analyticsDays} días`} icon="◎" loading={analyticsLoading} />
            <DashboardCard label="Visitas" value={analytics.pageViews} detail={`${analytics.todayViews} hoy`} icon="↗" loading={analyticsLoading} />
            <DashboardCard label="Productos vistos" value={analytics.productViews} detail="Fichas abiertas" icon="◉" loading={analyticsLoading} />
            <DashboardCard label="WhatsApp" value={analytics.whatsappClicks} detail={`${analytics.instagramClicks} Instagram`} icon="↗" accent loading={analyticsLoading} />
          </div>

          {analyticsError && <div className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">{analyticsError}</div>}

          <div className="mt-5 grid gap-4 sm:gap-5 lg:grid-cols-[1.15fr_.85fr]">
            <AnalyticsChart analytics={analytics} loading={analyticsLoading} />
            <TopProducts analytics={analytics} loading={analyticsLoading} />
          </div>
        </section>

        <section className="mt-7 sm:mt-8">
          <div className="text-[10px] font-black uppercase tracking-[.2em] text-sorella-blue sm:text-xs sm:tracking-[.22em]">Inventario</div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:mt-4 sm:gap-4 lg:grid-cols-4">
            <DashboardCard label="Productos" value={dashboard.all} detail={`${dashboard.featured} destacados`} icon="S" />
            <DashboardCard label="Unidades" value={dashboard.totalUnits} detail="Stock privado" icon="#" />
            <DashboardCard label="Stock bajo" value={dashboard.lowStock.length} detail="3 o menos" icon="!" accent={dashboard.lowStock.length > 0} />
            <DashboardCard label="Agotados" value={dashboard.out} detail={`${dashboard.hidden} ocultos`} icon="×" accent={dashboard.out > 0} />
          </div>
        </section>

        {dashboard.lowStock.length > 0 && (
          <section className="mt-4 rounded-[24px] border border-amber-100 bg-amber-50/70 p-4 sm:mt-5 sm:rounded-[28px] sm:p-5">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-amber-700 sm:text-xs">Stock bajo</div>
            <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 sm:flex-wrap sm:overflow-visible">
              {dashboard.lowStock.slice(0, 8).map(product => (
                <button key={product.id} type="button" onClick={() => openEditProduct(product)} className="shrink-0 rounded-full bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-sm transition active:scale-[.98] sm:text-sm sm:hover:text-sorella-red">
                  {product.name} · {product.stock}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="mt-7 sm:mt-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[.2em] text-sorella-blue sm:text-xs sm:tracking-[.22em]">Gestión</div>
              <h2 className="mt-1 text-xl font-black sm:text-2xl">Productos</h2>
            </div>

            <div className="grid gap-2 sm:flex sm:flex-row">
              <label className="relative w-full sm:min-w-[280px]">
                <span className="sr-only">Buscar productos</span>
                <input
                  value={search}
                  onChange={event => setSearch(event.target.value)}
                  placeholder="Buscar nombre, categoría o color…"
                  className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-4 pr-10 text-sm font-semibold outline-none transition focus:border-sorella-blue"
                />
                {search && <button type="button" onClick={() => setSearch('')} aria-label="Limpiar búsqueda" className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400 hover:text-sorella-red">×</button>}
              </label>
              <button type="button" onClick={openNewProduct} className="rounded-2xl bg-sorella-red px-5 py-3 font-black text-white shadow-sm transition active:scale-[.99] sm:hover:brightness-95">+ Agregar producto</button>
            </div>
          </div>

          <div className="mt-3 text-xs font-semibold text-slate-400 sm:mt-4 sm:text-sm">Mostrando {filteredProducts.length} de {products.length} productos</div>

          {loading ? (
            <div className="mt-4 rounded-[24px] bg-white p-8 text-center font-bold text-slate-500 shadow-sm sm:rounded-[28px] sm:p-10">Cargando inventario…</div>
          ) : filteredProducts.length === 0 ? (
            <div className="mt-4 rounded-[24px] bg-white p-8 text-center shadow-sm sm:rounded-[28px] sm:p-10">
              <div className="text-lg font-black text-slate-700">No encontramos productos</div>
              <p className="mt-2 text-sm text-slate-500">Prueba otra búsqueda o agrega un nuevo modelo.</p>
            </div>
          ) : (
            <>
              {/* Tarjetas para teléfono y tablet */}
              <div className="mt-4 grid gap-3 lg:hidden">
                {filteredProducts.map(product => (
                  <MobileAdminProductCard
                    key={product.id}
                    product={product}
                    onEdit={() => openEditProduct(product)}
                    onDelete={() => void remove(product.id)}
                    onStockChange={(raw) => void changeStock(product, raw)}
                    setProducts={setProducts}
                  />
                ))}
              </div>

              {/* Tabla para escritorio */}
              <div className="mt-4 hidden overflow-hidden rounded-[28px] bg-white shadow-sm lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
                      <tr><th className="p-4">Producto</th><th className="p-4">Categoría</th><th className="p-4">Stock privado</th><th className="p-4">Catálogo</th><th className="p-4">Acciones</th></tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map(product => (
                        <tr key={product.id} className="border-t border-slate-100 transition hover:bg-slate-50/70">
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <img src={product.image} alt={product.name} className={`h-14 w-20 rounded-xl bg-white object-contain p-1 ${product.stock <= 0 ? 'grayscale opacity-55' : ''}`} />
                                {product.stock <= 0 && <span className="absolute inset-x-1 bottom-1 rounded bg-sorella-red px-1 py-0.5 text-center text-[9px] font-black uppercase text-white">Agotado</span>}
                              </div>
                              <div><div className="font-black">{product.name}</div><div className="mt-1 text-xs font-semibold text-slate-400">{product.images?.length ?? 0} fotos</div></div>
                            </div>
                          </td>
                          <td className="p-4 text-sm font-semibold text-slate-600">{product.category}</td>
                          <td className="p-4">
                            <input
                              aria-label={`Stock de ${product.name}`}
                              type="number"
                              min="0"
                              value={product.stock}
                              onChange={event => {
                                const stock = Math.max(0, Number(event.target.value))
                                setProducts(current => current.map(item => item.id === product.id ? { ...item, stock, inStock: stock > 0 } : item))
                              }}
                              onBlur={event => void changeStock(product, event.target.value)}
                              className="w-24 rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-sorella-blue"
                            />
                          </td>
                          <td className="p-4"><span className={`rounded-full px-3 py-1 text-xs font-black ${product.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.visible ? 'Visible' : 'Oculto'}</span></td>
                          <td className="p-4">
                            <div className="flex gap-2">
                              <Link to={productPath(product)} target="_blank" className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold">Abrir</Link>
                              <button type="button" onClick={() => openEditProduct(product)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-bold">Editar</button>
                              <button type="button" onClick={() => void remove(product.id)} className="rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-sorella-red">Eliminar</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {editing && (
        <ProductEditor
          product={editing}
          isNew={isNew}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            setNotice('Producto guardado correctamente.')
            void refreshProducts()
          }}
        />
      )}
    </motion.main>
  )
}

function MobileAdminProductCard({
  product,
  onEdit,
  onDelete,
  onStockChange,
  setProducts,
}: {
  product: AdminProduct
  onEdit: () => void
  onDelete: () => void
  onStockChange: (raw: string) => void
  setProducts: React.Dispatch<React.SetStateAction<AdminProduct[]>>
}) {
  return (
    <article className="rounded-[24px] bg-white p-3.5 shadow-sm">
      <div className="flex gap-3">
        <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-50">
          <img src={product.image} alt={product.name} className={`h-full w-full object-contain p-1.5 ${product.stock <= 0 ? 'grayscale opacity-45' : ''}`} />
          {product.stock <= 0 && <span className="absolute inset-x-1 bottom-1 rounded-lg bg-sorella-red px-1 py-1 text-center text-[9px] font-black uppercase text-white">Agotado</span>}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-base font-black text-sorella-ink">{product.name}</h3>
              <p className="mt-0.5 truncate text-xs font-semibold text-sorella-blue">{product.category}</p>
            </div>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${product.visible ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{product.visible ? 'Visible' : 'Oculto'}</span>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-slate-400">{product.images?.length ?? 0} fotos {product.featured ? '· Destacado' : ''}</div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 p-3">
        <div>
          <div className="text-[9px] font-black uppercase tracking-[.16em] text-slate-400">Stock privado</div>
          <div className={`mt-0.5 text-xs font-bold ${product.stock > 0 ? 'text-emerald-700' : 'text-sorella-red'}`}>{product.stock > 0 ? 'Disponible' : 'Sin existencias'}</div>
        </div>
        <input
          aria-label={`Stock de ${product.name}`}
          type="number"
          min="0"
          value={product.stock}
          onChange={event => {
            const stock = Math.max(0, Number(event.target.value))
            setProducts(current => current.map(item => item.id === product.id ? { ...item, stock, inStock: stock > 0 } : item))
          }}
          onBlur={event => onStockChange(event.target.value)}
          className="w-20 rounded-xl border border-slate-200 bg-white px-3 py-2 text-center font-black outline-none focus:border-sorella-blue"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <Link to={productPath(product)} target="_blank" className="rounded-xl border border-slate-200 px-3 py-2.5 text-center text-xs font-black text-slate-600 active:bg-slate-50">Abrir</Link>
        <button type="button" onClick={onEdit} className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-black text-sorella-ink active:bg-slate-200">Editar</button>
        <button type="button" onClick={onDelete} className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-black text-sorella-red active:bg-red-100">Eliminar</button>
      </div>
    </article>
  )
}

function DashboardCard({ label, value, detail, icon, accent = false, loading = false }: { label: string; value: number; detail: string; icon: string; accent?: boolean; loading?: boolean }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }} className="rounded-[20px] bg-white p-3.5 shadow-sm sm:rounded-[26px] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-semibold text-slate-500 sm:text-sm">{label}</div>
          <div className={`mt-1.5 text-2xl font-black sm:mt-2 sm:text-3xl ${accent ? 'text-sorella-red' : 'text-sorella-ink'}`}>{loading ? '—' : value.toLocaleString('es')}</div>
        </div>
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-black sm:h-11 sm:w-11 sm:rounded-2xl sm:text-lg ${accent ? 'bg-red-50 text-sorella-red' : 'bg-slate-100 text-slate-600'}`}>{icon}</div>
      </div>
      <div className="mt-2 truncate text-[9px] font-semibold text-slate-400 sm:mt-3 sm:text-xs">{detail}</div>
    </motion.div>
  )
}

function AnalyticsChart({ analytics, loading }: { analytics: DashboardAnalytics; loading: boolean }) {
  const max = Math.max(1, ...analytics.daily.map(day => day.views))
  return (
    <section className="rounded-[24px] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-6">
      <div><div className="text-[10px] font-black uppercase tracking-[.18em] text-sorella-blue sm:text-xs sm:tracking-[.2em]">Tendencia</div><h3 className="mt-1 text-lg font-black sm:text-xl">Visitas por día</h3></div>
      {loading ? (
        <div className="mt-6 h-44 animate-pulse rounded-2xl bg-slate-100 sm:mt-8 sm:h-52" />
      ) : analytics.daily.length === 0 ? (
        <div className="mt-6 grid h-44 place-items-center rounded-2xl bg-slate-50 px-4 text-center text-sm font-semibold text-slate-400 sm:mt-8 sm:h-52">Aún no hay datos de visitas.</div>
      ) : (
        <div className="no-scrollbar mt-6 overflow-x-auto sm:mt-7">
          <div className="flex h-44 min-w-[520px] items-end gap-1.5 border-b border-slate-100 pb-1 sm:h-52 sm:min-w-0">
            {analytics.daily.map(day => {
              const height = Math.max(4, (day.views / max) * 100)
              const label = new Date(`${day.date}T00:00:00`).toLocaleDateString('es', { day: '2-digit', month: 'short' })
              return (
                <div key={day.date} className="group flex h-full min-w-0 flex-1 flex-col justify-end">
                  <div className="relative flex flex-1 items-end">
                    <div title={`${label}: ${day.views} visitas · ${day.visitors} visitantes`} style={{ height: `${height}%` }} className="w-full rounded-t-md bg-sorella-blue/70 transition group-hover:bg-sorella-red" />
                  </div>
                  <div className="mt-2 truncate text-center text-[8px] font-bold text-slate-400 sm:text-[9px]">{analytics.daily.length <= 10 ? label : label.slice(0, 2)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </section>
  )
}

function TopProducts({ analytics, loading }: { analytics: DashboardAnalytics; loading: boolean }) {
  const top = analytics.products.slice(0, 5)
  return (
    <section className="rounded-[24px] bg-white p-4 shadow-sm sm:rounded-[28px] sm:p-6">
      <div className="text-[10px] font-black uppercase tracking-[.18em] text-sorella-blue sm:text-xs sm:tracking-[.2em]">Interés</div>
      <h3 className="mt-1 text-lg font-black sm:text-xl">Productos más vistos</h3>
      {loading ? (
        <div className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">{[1,2,3,4].map(item => <div key={item} className="h-14 animate-pulse rounded-2xl bg-slate-100" />)}</div>
      ) : top.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-400 sm:mt-6">Cuando los clientes abran productos aparecerán aquí.</div>
      ) : (
        <div className="mt-4 space-y-2.5 sm:mt-5 sm:space-y-3">
          {top.map((product, index) => (
            <div key={product.productId} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 p-2.5 sm:gap-3 sm:p-3">
              <div className="w-4 text-center text-xs font-black text-slate-300 sm:w-5 sm:text-sm">{index + 1}</div>
              <img src={product.image} alt="" className="h-10 w-12 rounded-xl bg-white object-contain p-1 sm:h-11 sm:w-14"/>
              <div className="min-w-0 flex-1"><div className="truncate text-sm font-black text-slate-800 sm:text-base">{product.name}</div><div className="mt-0.5 truncate text-[9px] font-semibold text-slate-400 sm:text-xs">{product.whatsappClicks} WhatsApp · {product.instagramClicks} Instagram</div></div>
              <div className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-sorella-ink sm:px-3 sm:text-sm">{product.views}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function ProductEditor({ product, isNew, onClose, onSaved }: { product: AdminProduct; isNew: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<AdminProduct>(product)
  const [colorsText, setColorsText] = useState(product.colors.join(', '))
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const existingImages = form.images ?? []
  const remainingImageSlots = Math.max(0, MAX_IMAGES - existingImages.length)

  function handleImageSelection(files: FileList | null) {
    const selectedFiles = Array.from(files ?? [])
    setError('')
    if (selectedFiles.length === 0) return setImageFiles([])
    if (selectedFiles.length > remainingImageSlots) return setError(`Este producto puede tener un máximo de ${MAX_IMAGES} fotografías. Puedes agregar ${remainingImageSlots} más.`)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
    for (const file of selectedFiles) {
      if (!allowedTypes.includes(file.type)) return setError(`"${file.name}" no tiene un formato permitido. Usa JPG, PNG, WebP o AVIF.`)
      if (file.size > 5 * 1024 * 1024) return setError(`"${file.name}" pesa más de 5 MB.`)
    }
    setImageFiles(selectedFiles)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!form.name.trim()) return setError('Escribe el nombre del producto.')
    if (!form.category.trim()) return setError('Escribe la categoría del producto.')
    if (!form.description.trim()) return setError('Escribe una descripción.')
    if (isNew && imageFiles.length === 0) return setError('Selecciona al menos una fotografía para el producto.')
    setSaving(true)
    setError('')
    try {
      const stock = Math.max(0, Math.trunc(Number(form.stock) || 0))
      await saveAdminProduct({
        ...form,
        stock,
        inStock: stock > 0,
        name: form.name.trim(),
        category: form.category.trim(),
        description: form.description.trim(),
        colors: colorsText.split(',').map(color => color.trim()).filter(Boolean).slice(0, 20),
      }, isNew)
      if (imageFiles.length > 0) await uploadProductImages(imageFiles, form.id)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el producto.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/45 p-0 backdrop-blur-sm sm:p-5">
      <motion.form
        onSubmit={submit}
        initial={{ opacity: 0, y: 20, scale: .99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="mx-auto min-h-[100dvh] max-w-2xl bg-white pb-28 sm:my-6 sm:min-h-0 sm:rounded-[30px] sm:p-8 sm:pb-8 sm:shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 px-4 py-4 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-0">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[.2em] text-sorella-blue sm:text-xs sm:tracking-[.22em]">Producto</div>
            <h2 className="mt-1 truncate text-xl font-black sm:text-2xl">{isNew ? 'Nuevo producto' : `Editar ${product.name}`}</h2>
          </div>
          <button type="button" onClick={onClose} disabled={saving} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xl disabled:opacity-50">×</button>
        </div>

        <div className="px-4 sm:px-0">
          {error && <div className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700 sm:mt-5">{error}</div>}

          <div className="mt-5 grid gap-4 sm:mt-6 sm:grid-cols-2 sm:gap-5">
            <Field label="Nombre"><input required maxLength={120} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Ej. Sorella Roma" className="input" /></Field>
            <Field label="Categoría"><input required maxLength={80} value={form.category} onChange={event => setForm(current => ({ ...current, category: event.target.value }))} placeholder="Ej. Rectangular" className="input" /></Field>
            <Field label="Stock"><input type="number" min="0" value={form.stock} onChange={event => setForm(current => ({ ...current, stock: Math.max(0, Number(event.target.value)) }))} className="input" /></Field>
            <Field label="Colores (separados por coma)"><input maxLength={400} value={colorsText} onChange={event => setColorsText(event.target.value)} placeholder="Negro, Café, Gris" className="input" /></Field>
            <div className="sm:col-span-2"><Field label="Descripción"><textarea required maxLength={2000} rows={4} value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="Describe brevemente el modelo..." className="input resize-none" /></Field></div>

            <div className="sm:col-span-2">
              <Field label={`Fotos del producto · máximo ${MAX_IMAGES} · 5 MB cada una`}>
                <input type="file" multiple disabled={saving || remainingImageSlots === 0} accept="image/jpeg,image/png,image/webp,image/avif" onChange={event => { handleImageSelection(event.target.files); event.target.value = '' }} className="input disabled:cursor-not-allowed disabled:opacity-50" />
              </Field>
              <p className="mt-2 text-xs font-semibold text-slate-400">JPG, PNG, WebP o AVIF. {remainingImageSlots > 0 ? `Puedes agregar hasta ${remainingImageSlots} ${remainingImageSlots === 1 ? 'foto más' : 'fotos más'}.` : 'Ya alcanzaste el máximo de fotografías.'}</p>

              {imageFiles.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between"><p className="text-sm font-black text-slate-700">Nuevas fotografías</p><button type="button" disabled={saving} onClick={() => setImageFiles([])} className="text-sm font-bold text-sorella-red">Quitar todas</button></div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{imageFiles.map((file, index) => <ImagePreview key={`${file.name}-${file.lastModified}-${index}`} file={file} index={index} showPrincipal={existingImages.length === 0 && index === 0} onRemove={() => setImageFiles(current => current.filter((_, itemIndex) => itemIndex !== index))} />)}</div>
                </div>
              )}

              {!isNew && existingImages.length > 0 && (
                <div className="mt-6">
                  <p className="mb-3 text-sm font-black text-slate-700">Fotos guardadas</p>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {existingImages.map((image, index) => (
                      <div key={image.id} className="relative overflow-hidden rounded-2xl bg-slate-100">
                        <img src={image.imageUrl} alt={`${form.name} ${index + 1}`} className="aspect-square w-full object-contain p-1" />
                        {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-sorella-red px-2.5 py-1 text-[9px] font-black uppercase text-white sm:text-[10px]">Principal</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 grid gap-3 text-sm font-bold min-[390px]:grid-cols-2 sm:flex sm:flex-wrap sm:gap-4">
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 p-3 sm:bg-transparent sm:p-0"><input type="checkbox" checked={form.visible} onChange={event => setForm(current => ({ ...current, visible: event.target.checked }))} /> Visible en catálogo</label>
            <label className="flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-50 p-3 sm:bg-transparent sm:p-0"><input type="checkbox" checked={form.featured} onChange={event => setForm(current => ({ ...current, featured: event.target.checked }))} /> Destacado</label>
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2 border-t border-slate-200 bg-white/95 px-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] pt-3 backdrop-blur sm:static sm:mt-7 sm:flex sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
          <button type="button" disabled={saving} onClick={onClose} className="rounded-2xl border border-slate-200 px-5 py-3 font-bold disabled:opacity-50">Cancelar</button>
          <button type="submit" disabled={saving} className="rounded-2xl bg-sorella-red px-5 py-3 font-black text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar producto'}</button>
        </div>
      </motion.form>
    </div>
  )
}

function ImagePreview({ file, index, showPrincipal, onRemove }: { file: File; index: number; showPrincipal: boolean; onRemove: () => void }) {
  const [preview, setPreview] = useState('')
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-100">
      <img src={preview} alt={`Vista previa ${index + 1}`} className="aspect-square w-full object-contain p-1" />
      {showPrincipal && <span className="absolute left-2 top-2 rounded-full bg-sorella-red px-2.5 py-1 text-[9px] font-black uppercase text-white sm:text-[10px]">Principal</span>}
      <button type="button" onClick={onRemove} aria-label={`Quitar fotografía ${index + 1}`} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-lg font-bold text-white">×</button>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-sm font-black text-slate-700">{label}</span>{children}</label>
}
