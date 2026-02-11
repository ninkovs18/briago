import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { FiEye, FiEyeOff } from 'react-icons/fi'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { login, disabledMessage } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setError('')
      setLoading(true)
      await login(email, password)
      navigate('/profile')
    } catch (error: any) {
      setError('Neuspešna prijava')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-white">
            Prijavi se na svoj nalog
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Nemaš nalog?{' '}
            <Link to="/register" className="text-barbershop-gold hover:text-yellow-400">
              Registruj se
            </Link>
          </p>
        </div>

        <div className="bg-barbershop-gray rounded-lg p-8">
          {disabledMessage && (
            <div className="mb-4 p-3 bg-yellow-600 text-white rounded">
              {disabledMessage}
            </div>
          )}
          {error && (
            <div className="mb-4 p-3 bg-red-600 text-white rounded">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit} autoComplete="off">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email adresa
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                placeholder="Unesi svoj email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Lozinka
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full px-3 py-2 pr-20 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                  placeholder="Unesi svoju lozinku"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-gray-300 hover:text-white"
                  aria-label={showPassword ? 'Sakrij lozinku' : 'Prikaži lozinku'}
                >
                  {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {loading ? 'Učitavanje...' : 'Prijavi se'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Login
