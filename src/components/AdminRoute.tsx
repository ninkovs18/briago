import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AdminRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser, loading, isAdmin, roleLoading } = useAuth()
  const location = useLocation()

  if (loading || roleLoading) {
    return null
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!isAdmin) {
    // console.log(isAdmin)
    return <Navigate to="/" replace />
  }

  if (children) return <>{children}</>
  return <Outlet />
}

export default AdminRoute