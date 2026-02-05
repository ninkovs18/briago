import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useState } from 'react'

const Navbar = () => {
  const { currentUser, logout, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Neuspešna odjava', error)
    }
  }

  return (
    <nav className="bg-barbershop-dark border-b border-barbershop-gray">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-barbershop-gold">
                Briago
              </h1>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className="text-white hover:text-barbershop-gold transition-colors"
            >
              Početna
            </Link>
            <Link 
              to="/services" 
              className="text-white hover:text-barbershop-gold transition-colors"
            >
              Usluge
            </Link>
            <Link 
              to="/booking" 
              className="text-white hover:text-barbershop-gold transition-colors"
            >
              Zakaži termin
            </Link>
            
            {currentUser ? (
              <div className="flex items-center space-x-4">
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-white hover:text-barbershop-gold transition-colors"
                  >
                    Admin panel
                  </Link>
                )}
                <Link 
                  to="/profile" 
                  className="text-white hover:text-barbershop-gold transition-colors"
                >
                  Profil
                </Link>
                <button 
                  onClick={handleLogout}
                  className="btn-secondary"
                >
                  Odjavi se
                </button>
              </div>
            ) : (
              <Link 
                to="/login" 
                className="btn-primary"
              >
                Prijavi se
              </Link>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-white hover:text-barbershop-gold"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-barbershop-gray">
            <Link to="/" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-white hover:text-barbershop-gold">
              Početna
            </Link>
            <Link to="/services" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-white hover:text-barbershop-gold">
              Usluge
            </Link>
            <Link to="/booking" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-white hover:text-barbershop-gold">
              Zakaži termin
            </Link>
            {currentUser ? (
              <>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-white hover:text-barbershop-gold">
                    Admin panel
                  </Link>
                )}
                <Link to="/profile" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-white hover:text-barbershop-gold">
                  Profil
                </Link>
                <button onClick={async () => { setIsMenuOpen(false); await handleLogout(); }} className="block w-full text-left px-3 py-2 text-white hover:text-barbershop-gold">
                  Odjavi se
                </button>
              </>
            ) : (
              <Link to="/login" onClick={() => setIsMenuOpen(false)} className="block px-3 py-2 text-white hover:text-barbershop-gold">
                Prijavi se
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

export default Navbar
