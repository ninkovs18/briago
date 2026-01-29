import { Link, NavLink, Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const AdminLayout = () => {
  const { currentUser } = useAuth()
  const location = useLocation()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium ${isActive ? 'bg-[#1F50FF] text-white' : 'text-[#080E53] hover:bg-[#F0F3FF]'}`

  return (
    <div className="min-h-screen bg-[#F7F7F7] text-[#080E53]">
      <header className="sticky top-0 z-10 bg-white border-b border-[#F0F0F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link to="/admin/reservations" className="font-bold text-lg text-[#080E53]">Admin Panel</Link>
          <nav className="hidden md:flex items-center gap-2">
            <NavLink to="/admin/reservations" className={navLink}>Reservations</NavLink>
            <NavLink to="/admin/services" className={navLink}>Services</NavLink>
            <NavLink to="/admin/users" className={navLink}>Users</NavLink>
            <NavLink to="/" className={navLink}>Site</NavLink>
          </nav>
          <button
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-[#080E53] hover:bg-[#F0F3FF]"
            onClick={() => setIsMenuOpen((v) => !v)}
            aria-label="Open admin menu"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
        {isMenuOpen && (
          <div className="md:hidden border-t border-[#F0F0F0] bg-white">
            <div className="px-2 py-2 space-y-1">
              <NavLink to="/admin/reservations" className={navLink} onClick={() => setIsMenuOpen(false)}>Reservations</NavLink>
              <NavLink to="/admin/services" className={navLink} onClick={() => setIsMenuOpen(false)}>Services</NavLink>
              <NavLink to="/admin/users" className={navLink} onClick={() => setIsMenuOpen(false)}>Users</NavLink>
              <NavLink to="/" className={navLink} onClick={() => setIsMenuOpen(false)}>Site</NavLink>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  )
}

export default AdminLayout
