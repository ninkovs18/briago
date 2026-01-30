import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { doc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'


const Registration = () => {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { signup } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setError('Lozinke se ne poklapaju')
      return
    }

    try {
      setError('')
      setLoading(true)

      const cred = await signup(email, password)

      const uid = cred.user.uid

    await setDoc(doc(db, 'users', uid), {
      fullName,
      phone,
      email,
      isAdmin: false,
      verified: false,
      disabled: false,
      createdAt: new Date()
    })

      navigate('/profile')
    } catch (error: any) {
      console.error(error)
      setError('Neuspešno kreiranje naloga')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold text-white">
            Kreiraj svoj nalog
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            Već imaš nalog?{' '}
            <Link to="/login" className="text-barbershop-gold hover:text-yellow-400">
              Prijavi se
            </Link>
          </p>
        </div>

        <div className="bg-barbershop-gray rounded-lg p-8">
          {error && (
            <div className="mb-4 p-3 bg-red-600 text-white rounded">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Ime i prezime
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                placeholder="Petar Petrović"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Broj telefona
              </label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                placeholder="+381 64 123 4567"
              />
            </div>

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
                className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                placeholder="Unesi svoj email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white mb-2">
                Lozinka
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                placeholder="Unesi svoju lozinku"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-white mb-2">
                Potvrdi lozinku
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                placeholder="Ponovi lozinku"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 disabled:opacity-50"
              >
                {loading ? 'Učitavanje...' : 'Registruj se'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default Registration
