import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'

export default function Unauthorized() {
  const { signOut } = useAuth()
  return <main className="grid min-h-screen place-items-center bg-sorella-mist p-5"><div className="max-w-lg rounded-[32px] bg-white p-8 text-center shadow-soft"><div className="text-xs font-black uppercase tracking-[.22em] text-sorella-red">Acceso denegado</div><h1 className="mt-3 text-3xl font-black">Tu cuenta no es moderadora.</h1><p className="mt-3 text-slate-500">Aunque hayas iniciado sesión, la base de datos bloquea las operaciones administrativas si tu usuario no tiene el rol correcto.</p><div className="mt-7 flex justify-center gap-3"><Link to="/" className="rounded-full border border-slate-200 px-5 py-3 font-bold">Ir al catálogo</Link><button onClick={() => signOut()} className="rounded-full bg-sorella-ink px-5 py-3 font-bold text-white">Cerrar sesión</button></div></div></main>
}
