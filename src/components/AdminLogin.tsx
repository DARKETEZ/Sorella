import { FormEvent, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../lib/AuthProvider'
import { isSupabaseConfigured } from '../lib/supabase'

export default function AdminLogin() {
  const { user, hasModeratorRole, isModerator, signIn, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!loading && user && isModerator) return <Navigate to="/admin" replace />
  if (!loading && user && hasModeratorRole) return <Navigate to="/admin/mfa" replace />
  if (!loading && user && !hasModeratorRole) return <Navigate to="/admin/no-autorizado" replace />

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="min-h-screen bg-sorella-mist px-5 py-16">
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-md">
      <Link to="/" className="text-sm font-bold text-sorella-blue">← Volver al catálogo</Link>
      <form onSubmit={submit} className="mt-8 rounded-[32px] bg-white p-8 shadow-soft">
        <img src="/sorella-logo.png" alt="Sorella Eyewear" className="mb-7 h-12 w-auto max-w-[230px] object-contain" />
        <div className="text-xs font-black uppercase tracking-[.22em] text-sorella-blue">Acceso restringido</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight">Sorella Admin</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">Solo cuentas autorizadas como moderador pueden gestionar el catálogo. Después de tu contraseña se exige verificación 2FA.</p>
        {!isSupabaseConfigured && <div className="mt-5 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">Supabase todavía no está configurado. Revisa el README y el archivo <code>.env.example</code>.</div>}
        <label className="mt-6 block text-sm font-bold">Correo</label>
        <input required type="email" autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sorella-blue" />
        <label className="mt-4 block text-sm font-bold">Contraseña</label>
        <input required type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-sorella-blue" />
        {error && <p className="mt-3 text-sm font-semibold text-sorella-red">{error}</p>}
        <button disabled={submitting || !isSupabaseConfigured} className="mt-6 w-full rounded-2xl bg-sorella-red px-5 py-3.5 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{submitting ? 'Verificando…' : 'Entrar'}</button>
      </form>
    </motion.div>
  </main>
}
