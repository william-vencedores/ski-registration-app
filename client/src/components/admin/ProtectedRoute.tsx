import { Navigate } from 'react-router-dom'
import { useAdminStore } from '../../lib/adminStore'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAdminStore()
  return isAuthenticated() ? <>{children}</> : <Navigate to="/admin/login" replace />
}
