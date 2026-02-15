import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const AdminLayout = () => {
  const { currentUser } = useAuth()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `shrink-0 px-2 sm:px-3 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-semibold whitespace-nowrap ${isActive ? 'bg-[#1F50FF] text-white' : 'text-[#080E53] hover:bg-[#F0F3FF]'}`

  return (
    <div className="admin-panel h-dvh bg-[#F7F7F7] text-[#080E53] flex flex-col overflow-hidden">
      <header className="bg-white border-b border-[#F0F0F0]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-3">
          <nav className="flex items-center justify-start sm:justify-end gap-1.5 sm:gap-2 overflow-x-auto whitespace-nowrap">
            <NavLink to="/admin/reservations" className={navLink}>Rezervacije</NavLink>
            <NavLink to="/admin/services" className={navLink}>Usluge</NavLink>
            <NavLink to="/admin/users" className={navLink}>Korisnici</NavLink>
            <NavLink to="/admin/settings" className={navLink}>Podešavanja</NavLink>
            <NavLink to="/" className={navLink}>Sajt</NavLink>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full flex-1 min-h-0 px-2 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
