import { Navigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'

export default function ProtectedMfaRoute({ children }: { children: React.ReactNode }) {
  const { user, hasModeratorRole, isModerator, loading } = useAuth()

  if (loading) return <div className="grid min-h-screen place-items-center bg-sorella-mist"><div className="text-sm font-black uppercase tracking-[.22em] text-sorella-blue">Verificando seguridad…</div></div>
  if (!user) return <Navigate to="/admin/login" replace />
  if (!hasModeratorRole) return <Navigate to="/admin/no-autorizado" replace />
  if (isModerator) return <Navigate to="/admin" replace />
  return <>{children}</>
}
