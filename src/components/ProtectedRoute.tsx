import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { currentUser, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return null
  }

  if (!currentUser) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  // If used as a wrapper with children
  if (children) return <>{children}</>
  // If used in route element with Outlet
  return <Outlet />
}

export default ProtectedRoute
