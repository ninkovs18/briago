import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { collection, deleteDoc, doc, getDoc, getDocs, query, Timestamp, updateDoc, where } from 'firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import { db } from '../firebase'
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth'
import { isValidSerbianPhone, normalizePhone } from '../utils/phone'
import { formatDateDotted } from '../utils/date'

const Profile = () => {
  const { currentUser } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState<boolean>(true)
  const [loading, setLoading] = useState<boolean>(true)
  const [cancelId, setCancelId] = useState<string | null>(null)
  const [cancelLoading, setCancelLoading] = useState<boolean>(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile')
  const [profileEdit, setProfileEdit] = useState({ fullName: '', phone: '' })
  const [profileSaving, setProfileSaving] = useState<boolean>(false)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  if (!currentUser) {
    return <Navigate to="/login" />
  }

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!currentUser?.uid) return
      setProfileLoading(true)
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid))
        if (snap.exists()) {
          setUserProfile(snap.data() as UserProfile)
        } else {
          setUserProfile(null)
        }
      } catch (err) {
        console.error('Greška pri učitavanju profila:', err)
        setUserProfile(null)
      } finally {
        setProfileLoading(false)
      }
    }

    fetchUserProfile()
  }, [currentUser?.uid])

  useEffect(() => {
    if (!userProfile) return
    setProfileEdit({
      fullName: userProfile.fullName || '',
      phone: userProfile.phone || ''
    })
  }, [userProfile?.fullName, userProfile?.phone])

  useEffect(() => {
    const fetchAppointments = async () => {
      if (!currentUser?.uid) return
      setLoading(true)
      try {
        const servicesSnap = await getDocs(collection(db, 'services'))
        const servicesById = new Map<string, string>()
        servicesSnap.forEach((doc) => {
          const data = doc.data() as { name?: string }
          if (data?.name) servicesById.set(doc.id, data.name)
        })

        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('userId', '==', currentUser.uid)
        )
        const reservationsSnap = await getDocs(reservationsQuery)

        const list: Appointment[] = reservationsSnap.docs.map((doc) => {
          const data = doc.data() as ReservationDoc
          const serviceName =
            (data.serviceId ? servicesById.get(data.serviceId) : undefined) || 'Usluga'

          const time = data.startTime || ''

          return {
            id: doc.id,
            service: serviceName,
            date: data.date || '',
            time
          }
        })

        setAppointments(list)
      } catch (err) {
        console.error('Greška pri učitavanju termina:', err)
        setAppointments([])
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [currentUser?.uid])

  const [upcomingAppointments, pastAppointments] = useMemo(() => {
    const toDateTime = (date: string, time: string) => {
      if (!date) return null
      const normalizedTime = time ? time : '00:00'
      const dt = new Date(`${date}T${normalizedTime}`)
      return Number.isNaN(dt.getTime()) ? new Date(date) : dt
    }

    const now = new Date()
    const upcoming: Appointment[] = []
    const past: Appointment[] = []

    appointments.forEach((a) => {
      const dt = toDateTime(a.date, a.time)
      if (!dt) return
      if (dt >= now) upcoming.push(a)
      else past.push(a)
    })

    const sortByDateTime = (a: Appointment, b: Appointment) => {
      const da = toDateTime(a.date, a.time)?.getTime() ?? 0
      const db = toDateTime(b.date, b.time)?.getTime() ?? 0
      return da - db
    }

    upcoming.sort(sortByDateTime)
    past.sort(sortByDateTime).reverse()

    return [upcoming, past]
  }, [appointments])

  const weekdayLabel = (date: string) => {
    if (!date) return ''
    const d = new Date(date)
    const label = d.toLocaleDateString('sr-Latn-RS', { weekday: 'long' })
    return label ? label.charAt(0).toUpperCase() + label.slice(1) : ''
  }

  const openCancel = (id: string) => {
    setCancelError(null)
    setCancelId(id)
  }

  const closeCancel = () => {
    setCancelId(null)
    setCancelError(null)
  }

  const confirmCancel = async () => {
    if (!cancelId) return
    setCancelLoading(true)
    try {
      const appointment = appointments.find((a) => a.id === cancelId)
      await deleteDoc(doc(db, 'reservations', cancelId))
      if (appointment?.date && appointment?.time) {
        const slotId = `${appointment.date}_${appointment.time}`
        await deleteDoc(doc(db, 'slots', slotId))
      }
      setAppointments((prev) => prev.filter((a) => a.id !== cancelId))
      setSuccessMessage('Termin je uspešno otkazan.')
      closeCancel()
    } catch (err) {
      console.error('Greška pri otkazivanju termina:', err)
      setCancelError('Došlo je do greške, pokušajte ponovo.')
    } finally {
      setCancelLoading(false)
    }
  }

  const handleProfileSave = async () => {
    if (!currentUser?.uid) return
    const normalizedFullName = profileEdit.fullName.trim()
    if (!normalizedFullName) {
      setProfileError('Ime i prezime ili nadimak je obavezno.')
      return
    }

    setProfileError(null)
    setProfileSuccess(null)
    setProfileSaving(true)
    try {
      const existingSnap = await getDocs(
        query(collection(db, 'users'), where('fullName', '==', normalizedFullName))
      )
      const nameTaken = existingSnap.docs.some((d) => d.id !== currentUser.uid)
      if (nameTaken) {
        setProfileError('Ime i prezime ili nadimak već postoji. Unesi drugi.')
        return
      }

      const normalizedPhone = normalizePhone(profileEdit.phone)
      if (profileEdit.phone.trim() && !isValidSerbianPhone(normalizedPhone)) {
        setProfileError('Unesi važeći broj telefona (npr. +381641234567 ili 0641234567).')
        return
      }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        fullName: normalizedFullName,
        phone: normalizedPhone
      })
      setUserProfile((prev) => ({
        ...(prev ?? {}),
        fullName: normalizedFullName,
        phone: normalizedPhone
      }))
      setProfileSuccess('Podaci su uspešno sačuvani.')
    } catch (err) {
      console.error(err)
      setProfileError('Greška pri čuvanju podataka.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!currentUser?.email) return
    if (!currentPassword || !newPassword || !confirmPassword) {
      setProfileError('Popuni sva polja za promenu lozinke.')
      return
    }
    if (newPassword !== confirmPassword) {
      setProfileError('Lozinke se ne poklapaju.')
      return
    }

    setProfileError(null)
    setProfileSuccess(null)
    setProfileSaving(true)
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPassword)
      await reauthenticateWithCredential(currentUser, credential)
      await updatePassword(currentUser, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setProfileSuccess('Lozinka je uspešno promenjena.')
    } catch (err) {
      console.error(err)
      setProfileError('Greška pri promeni lozinke. Proveri trenutnu lozinku.')
    } finally {
      setProfileSaving(false)
    }
  }

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Moj <span className="text-barbershop-gold">profil</span>
          </h1>
        </div>

        <div className="mb-6 flex items-center justify-center gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-md text-sm font-semibold border ${
              activeTab === 'profile'
                ? 'bg-barbershop-gold text-black border-transparent'
                : 'bg-barbershop-gray text-gray-200 border-gray-700'
            }`}
          >
            Profil
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-md text-sm font-semibold border ${
              activeTab === 'settings'
                ? 'bg-barbershop-gold text-black border-transparent'
                : 'bg-barbershop-gray text-gray-200 border-gray-700'
            }`}
          >
            Podešavanja
          </button>
        </div>

        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Info */}
            <div className="bg-barbershop-gray rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Podaci naloga</h2>
              {profileLoading ? (
                <div className="text-center py-6">
                  <p className="text-gray-400">Učitavanje profila...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {!userProfile?.isAdmin && !userProfile?.verified && (
                    <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-200">
                      Profil nije verifikovan. Kada admin potvrdi nalog, moći ćeš da zakažeš termin.
                    </div>
                  )}
                  <div>
                    <label className="text-sm text-gray-400">Ime i prezime ili nadimak</label>
                    <p className="text-white">{userProfile?.fullName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Telefon</label>
                    <p className="text-white">{userProfile?.phone || '—'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="text-white">{userProfile?.email || currentUser.email || '—'}</p>
                  </div>
                </div>
              )}
              {!profileLoading && (
                <div className="mt-6">
                  {userProfile?.isAdmin ? (
                    <span className="block w-full text-center rounded-md border border-blue-500/40 bg-blue-500/10 px-4 py-2 font-semibold text-blue-200 cursor-default">
                      Admin nalog
                    </span>
                  ) : userProfile?.verified ? (
                    <span className="block w-full text-center rounded-md border border-green-500/40 bg-green-500/10 px-4 py-2 font-semibold text-green-200 cursor-default">
                      Verifikovan
                    </span>
                  ) : (
                    <span className="block w-full text-center rounded-md border border-yellow-500/50 bg-yellow-500/10 px-4 py-2 font-semibold text-yellow-200 cursor-default">
                      Nije verifikovan
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Upcoming Appointments */}
            <div className="lg:col-span-2 bg-barbershop-gray rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Predstojeći termini</h2>
              
              {loading ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Učitavanje termina...</p>
                </div>
              ) : upcomingAppointments.length > 0 ? (
                <div className="space-y-4">
                  {upcomingAppointments.map((appointment) => (
                    <div key={appointment.id} className="relative bg-barbershop-dark rounded-xl border border-gray-700/60 p-5 pb-12">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                        <div className="flex items-center gap-4">
                          <div className="rounded-lg bg-barbershop-gold/15 px-3 py-2 text-center">
                            <div className="text-sm text-barbershop-gold">{weekdayLabel(appointment.date)}</div>
                            <div className="text-2xl font-bold text-white">{appointment.time || '--:--'}</div>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-white">{appointment.service}</h3>
                            <p className="text-sm text-gray-400">
                            {formatDateDotted(appointment.date)}
                          </p>
                          </div>
                        </div>
                      </div>
                      <button
                        className="absolute bottom-4 right-4 inline-flex items-center justify-center rounded-md px-2 py-1 text-[11px] font-medium text-red-400 hover:text-red-300"
                        onClick={() => openCancel(appointment.id)}
                      >
                        Otkaži
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">Nema predstojećih termina</p>
                  <Link to="/booking" className="btn-primary inline-block">
                    Zakaži termin
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Edit Profile */}
            <div className="bg-barbershop-gray rounded-lg p-6">
              <h2 className="text-2xl font-bold text-white mb-4">Izmeni podatke</h2>
              {profileError && (
                <div className="mb-4 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="mb-4 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-200">
                  {profileSuccess}
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Ime i prezime ili nadimak</label>
                  <input
                    value={profileEdit.fullName}
                    onChange={(e) => setProfileEdit((prev) => ({ ...prev, fullName: e.target.value }))}
                    className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                    placeholder="Petar Petrović / Peki"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Telefon</label>
                  <input
                    value={profileEdit.phone}
                    onChange={(e) => setProfileEdit((prev) => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                    placeholder="+381 64 123 4567"
                  />
                </div>
                <button
                  className="btn-primary w-full disabled:opacity-50"
                  onClick={handleProfileSave}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Čuvanje...' : 'Sačuvaj podatke'}
                </button>
              </div>
            </div>

            {/* Change Password */}
            <div className="bg-barbershop-gray rounded-lg p-6">
              <h3 className="text-2xl font-bold text-white mb-4">Promeni lozinku</h3>
              <div className="space-y-3">
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                  placeholder="Trenutna lozinka"
                />
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                  placeholder="Nova lozinka"
                />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-barbershop-dark border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-barbershop-gold"
                  placeholder="Potvrdi novu lozinku"
                />
                <button
                  className="btn-secondary w-full disabled:opacity-50"
                  onClick={handlePasswordChange}
                  disabled={profileSaving}
                >
                  {profileSaving ? 'Čuvanje...' : 'Promeni lozinku'}
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="mt-8 bg-barbershop-gray rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Istorija termina</h2>
            {loading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">Učitavanje termina...</p>
              </div>
            ) : pastAppointments.length > 0 ? (
              <div className="space-y-4">
                {pastAppointments.slice(0, 5).map((appointment) => (
                  <div key={appointment.id} className="bg-barbershop-dark rounded-xl border border-gray-700/60 p-5">
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-gray-700/40 px-3 py-2 text-center">
                        <div className="text-sm text-gray-300">{weekdayLabel(appointment.date)}</div>
                        <div className="text-2xl font-bold text-white">{appointment.time || '--:--'}</div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{appointment.service}</h3>
                        <p className="text-sm text-gray-400">
                        {formatDateDotted(appointment.date)}
                      </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">Nema prethodnih termina</p>
              </div>
            )}
          </div>
        )}
      </div>
      {cancelId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-barbershop-gray p-6 text-white shadow-xl">
            <h3 className="text-xl font-semibold text-white">Potvrdi otkazivanje</h3>
            <p className="mt-2 text-gray-200">
              Da li si siguran da želiš da otkažeš ovaj termin?
            </p>
            {cancelError && (
              <p className="mt-3 text-sm text-red-300">{cancelError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button className="btn-secondary" onClick={closeCancel} disabled={cancelLoading}>
                Nazad
              </button>
              <button className="btn-primary" onClick={confirmCancel} disabled={cancelLoading}>
                {cancelLoading ? 'Otkazivanje...' : 'Otkaži termin'}
              </button>
            </div>
          </div>
        </div>
      )}
      {successMessage && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-barbershop-gray p-6 text-white shadow-xl">
            <h3 className="text-xl font-semibold text-green-300">Uspešno</h3>
            <p className="mt-2 text-gray-200">{successMessage}</p>
            <div className="mt-6 flex justify-end">
              <button className="btn-primary" onClick={() => setSuccessMessage(null)}>
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile

type ReservationDoc = {
  date?: string
  startTime?: string
  serviceId?: string
}

type Appointment = {
  id: string
  service: string
  date: string
  time: string
}

type UserProfile = {
  fullName?: string
  phone?: string
  email?: string
  isAdmin?: boolean
  verified?: boolean
  createdAt?: Timestamp | Date | string
}
