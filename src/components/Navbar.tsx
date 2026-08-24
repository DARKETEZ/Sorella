import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  function closeMenu() {
    setOpen(false)
  }

  const homeHref = location.pathname === '/' ? '/#catalogo' : '/#catalogo'

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/60 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link to="/" onClick={closeMenu} className="flex min-w-0 items-center transition-opacity active:opacity-70 sm:hover:opacity-80">
          <img
            src="/sorella-logo.png"
            alt="Sorella Eyewear"
            className="h-9 w-auto max-w-[180px] object-contain sm:h-12 sm:max-w-[230px]"
          />
        </Link>

        <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-700 sm:flex">
          <a href={homeHref} className="transition-colors hover:text-sorella-red">Catálogo</a>
          <a href="/#contacto" className="transition-colors hover:text-sorella-red">Contacto</a>
        </nav>

        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
          aria-expanded={open}
          className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200/80 bg-white/85 text-sorella-ink shadow-sm active:scale-95 sm:hidden"
        >
          <span className="relative block h-4 w-5">
            <span className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition ${open ? 'translate-y-[7px] rotate-45' : ''}`} />
            <span className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition ${open ? 'opacity-0' : ''}`} />
            <span className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition ${open ? '-translate-y-[7px] -rotate-45' : ''}`} />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="border-t border-slate-100 bg-white/95 px-4 pb-4 pt-3 shadow-lg backdrop-blur-xl sm:hidden"
          >
            <div className="mx-auto grid max-w-7xl gap-2">
              <a onClick={closeMenu} href="/#catalogo" className="rounded-2xl bg-slate-50 px-4 py-3.5 text-base font-black text-sorella-ink active:bg-slate-100">Catálogo</a>
              <a onClick={closeMenu} href="/#contacto" className="rounded-2xl bg-slate-50 px-4 py-3.5 text-base font-black text-sorella-ink active:bg-slate-100">Contacto</a>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a onClick={closeMenu} href="https://wa.me/50370000000" target="_blank" rel="noopener noreferrer" className="rounded-2xl bg-sorella-red px-4 py-3 text-center text-sm font-black text-white">WhatsApp</a>
                <a onClick={closeMenu} href="https://instagram.com/" target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-black text-sorella-ink">Instagram</a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
