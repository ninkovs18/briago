import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import DatePicker from '../components/DatePicker'
import StepCard from '../components/StepCard'
import TimeSlider from '../components/TimeSlider'
import { db } from '../firebase'
import { useAuth } from '../contexts/AuthContext'
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore'

// TYPE DEFINITIONS
interface Service {
  id: string
  name: string
  price: number
  duration: number
  description: string
}

interface FormData {
  service: string
  serviceId: string
  date: string
  time: string
}

interface Reservation {
  startTime: string
  endTime: string
  status: string
  date: string
}

const Booking = () => {
  const navigate = useNavigate()
  const { currentUser, isVerified, isAdmin, roleLoading } = useAuth()
  const [formData, setFormData] = useState<FormData>({
    service: '',
    serviceId: '',
    date: '',
    time: '',
  })

  const [currentStep, setCurrentStep] = useState<number>(0)
  const [services, setServices] = useState<Service[]>([])
  const [loadingServices, setLoadingServices] = useState<boolean>(true)
  const [availableTimes, setAvailableTimes] = useState<string[]>([])
  const [filteredServices, setFilteredServices] = useState<Service[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [modal, setModal] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const timeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30'
  ]

  const toMinutes = (label: string) => {
    const [hStr, mStr] = label.split(':')
    const h = parseInt(hStr, 10)
    const m = parseInt(mStr || '0', 10)
    return h * 60 + m
  }

  const calculateEndTime = (start: string, duration: number) => {
    const [hStr, mStr] = start.split(':')
    const h = Number(hStr)
    const m = Number(mStr || '0')
    const total = h * 60 + m + duration
    const endH = Math.floor(total / 60) % 24
    const endM = total % 60
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`
  }

  // FETCH SERVICES
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'services'))
        const data: Service[] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Service, 'id'>),
        }))
        setServices(data)
        setFilteredServices(data)
      } catch (err) {
        console.error('Greška pri učitavanju usluga:', err)
      } finally {
        setLoadingServices(false)
      }
    }
    fetchServices()
  }, [])

  // FETCH RESERVATIONS
  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'reservations'))
        const data: Reservation[] = snapshot.docs.map(doc => doc.data() as Reservation)
        setReservations(data)
      } catch (err) {
        console.error("Greška pri učitavanju rezervacija:", err)
      }
    }
    fetchReservations()
  }, [])

  // UPDATE AVAILABLE TIMES
  useEffect(() => {
    if (!formData.date) {
      setAvailableTimes([])
      return
    }

    const date = new Date(formData.date + 'T00:00:00')
    const day = date.getDay()
    if (day === 0) { // no Sundays
      setAvailableTimes([])
      return
    }

    const reservationsOnDate = reservations
      .filter(r => r.date === formData.date && r.status === 'active')
      .map(r => ({
        start: toMinutes(r.startTime),
        end: toMinutes(r.endTime)
      }))

    let freeSlots = timeSlots.filter(slot => {
      const slotStart = toMinutes(slot)
      // slot mora da stane u sve postojeće rezervacije
      const conflict = reservationsOnDate.some(r => slotStart < r.end && slotStart >= r.start)
      return !conflict
    })

    // if today, remove past times
    const now = new Date()
    if (date.toDateString() === now.toDateString()) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes()
      freeSlots = freeSlots.filter(t => toMinutes(t) > nowMinutes)
    }

    setAvailableTimes(freeSlots)
  }, [formData.date, reservations])

  // FILTER SERVICES BASED ON SELECTED TIME
  useEffect(() => {
    if (!formData.time) {
      setFilteredServices(services)
      return
    }

    const slotStart = toMinutes(formData.time)
    const reservationsOnDate = reservations
      .filter(r => r.date === formData.date && r.status === 'active')
      .map(r => ({
        start: toMinutes(r.startTime),
        end: toMinutes(r.endTime)
      }))

    const filtered = services.filter(s => {
      const serviceEnd = slotStart + s.duration
      // preklapanje sa postojećim rezervacijama
      const conflict = reservationsOnDate.some(r => slotStart < r.end && serviceEnd > r.start)
      return !conflict
    })
    setFilteredServices(filtered)
  }, [formData.time, formData.date, services, reservations])

  const canContinueFromStep0 = !!(formData.date && formData.time)
  const canContinueFromStep1 = !!formData.serviceId
  const canSubmit = useMemo(() => !!(formData.date && formData.time && formData.serviceId), [formData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    if (!currentUser) {
      setModal({ type: 'error', message: 'Morate biti prijavljeni da biste rezervisali termin.' })
      return
    }
    if (!isVerified && !isAdmin) {
      setModal({ type: 'error', message: 'Nalog još uvek nije verifikovan. Sačekajte verifikaciju admina.' })
      return
    }
    const service = services.find((s) => s.id === formData.serviceId)
    if (!service) {
      setModal({ type: 'error', message: 'Greška — usluga ne postoji.' })
      return
    }
    const endTime = calculateEndTime(formData.time, service.duration)
    try {
      await addDoc(collection(db, 'reservations'), {
        userId: currentUser.uid,
        serviceId: formData.serviceId,
        date: formData.date,
        startTime: formData.time,
        endTime,
        status: "active",
        createdAt: Timestamp.now(),
      })
      setCurrentStep(0)
      setFormData({ service: '', serviceId: '', date: '', time: '' })
      setModal({ type: 'success', message: 'Uspešno ste rezervisali termin.' })
    } catch (err) {
      console.error("Greška pri rezervaciji:", err)
      setModal({ type: 'error', message: 'Došlo je do greške, pokušajte ponovo.' })
    }
  }

  const stepStatus = (idx: number): 'complete' | 'current' | 'upcoming' => {
    if (idx < currentStep) return 'complete'
    if (idx === currentStep) return 'current'
    return 'upcoming'
  }

  const isBlocked = !isVerified && !isAdmin

  if (roleLoading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-white text-2xl">
        Učitavanje...
      </div>
    )
  }

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Izaberi <span className="text-barbershop-gold">Termin</span>
          </h1>
          <p className="text-xl text-gray-300">
            Zakaži svoj termin i prepusti mi brigu o tvom izgledu
          </p>
          {isBlocked && (
            <div className="mt-6 inline-flex max-w-2xl items-start gap-3 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-left text-yellow-200">
              <span className="mt-0.5 text-lg">⚠️</span>
              <div>
                <div className="font-semibold">Profil nije verifikovan</div>
                <div className="text-sm text-yellow-200/90">
                  Sačekaj da admin potvrdi nalog kako bi mogao da zakažeš termin.
                </div>
              </div>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1 */}
          <StepCard
            title="Izaberi datum i vreme"
            status={stepStatus(0)}
            onHeaderClick={currentStep >= 0 ? () => setCurrentStep(0) : undefined}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Datum *
                </label>
                <DatePicker
                  value={formData.date}
                  onChange={(value) => setFormData({ ...formData, date: value })}
                  daysAhead={14}
                  includeToday={true}
                  disabled={isBlocked}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Vreme *
                </label>
                <TimeSlider
                  value={formData.time}
                  onChange={(val) => setFormData({ ...formData, time: val })}
                  slots={availableTimes}
                  emptyMessage={!formData.date ? 'Izaberi datum da vidiš slobodne termine.' : 'Nema termina za ovaj dan.'}
                  disabled={isBlocked}
                />
              </div>
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => canContinueFromStep0 && setCurrentStep(1)}
                  disabled={!canContinueFromStep0 || isBlocked}
                  className="btn-primary disabled:opacity-50"
                >
                  Dalje
                </button>
              </div>
            </div>
          </StepCard>

          {/* Step 2 — services */}
          <StepCard
            title="Izaberi uslugu"
            status={stepStatus(1)}
            onHeaderClick={currentStep >= 1 ? () => setCurrentStep(1) : undefined}
          >
            <div className="space-y-4">
              {loadingServices ? (
                <p className="text-gray-400">Učitavanje usluga…</p>
              ) : (
                <>
                  <label className="block text-sm font-medium text-white mb-2">
                    Usluga *
                  </label>
                  <select
                    value={formData.serviceId}
                    onChange={(e) => {
                      const service = services.find((s) => s.id === e.target.value)
                      setFormData({
                        ...formData,
                        serviceId: e.target.value,
                        service: service ? service.name : '',
                      })
                    }}
                    className="w-full px-3 py-2 bg-barbershop-dark border rounded-md text-white"
                    required
                    disabled={isBlocked}
                  >
                    <option value="">Izaberi uslugu</option>
                    {filteredServices.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} — {s.price} RSD
                      </option>
                    ))}
                  </select>
                </>
              )}

              <div className="flex justify-between">
                <button type="button" className="btn-secondary" onClick={() => setCurrentStep(0)}>
                  Nazad
                </button>
                <button
                  type="button"
                  onClick={() => canContinueFromStep1 && setCurrentStep(2)}
                  disabled={!canContinueFromStep1 || isBlocked}
                  className="btn-primary disabled:opacity-50"
                >
                  Dalje
                </button>
              </div>
            </div>
          </StepCard>

          {/* Step 3 — confirmation */}
          <StepCard
            title="Proveri detalje i potvrdi"
            status={stepStatus(2)}
            onHeaderClick={currentStep >= 2 ? () => setCurrentStep(2) : undefined}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <div className="rounded-md border border-gray-700 p-4 bg-barbershop-dark">
                  <h3 className="text-white font-semibold mb-2">Detalji termina:</h3>
                  <ul className="text-gray-300 text-sm space-y-1">
                    <li><span className="text-white">Datum:</span> {formData.date || '—'}</li>
                    <li><span className="text-white">Vreme:</span> {formData.time || '—'}</li>
                    <li><span className="text-white">Usluga:</span> {formData.service || '—'}</li>
                  </ul>
                </div>
              </div>

              <div className="md:col-span-2 flex justify-between">
                <button type="button" className="btn-secondary" onClick={() => setCurrentStep(1)}>
                  Nazad
                </button>
                <button type="submit" disabled={!canSubmit || isBlocked} className="btn-primary disabled:opacity-50">
                  Potvrdi rezervaciju!
                </button>
              </div>
            </div>
          </StepCard>
        </form>
      </div>
      {modal && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-barbershop-gray p-6 text-white shadow-xl">
            <h3 className={`text-xl font-semibold ${modal.type === 'success' ? 'text-green-300' : 'text-yellow-300'}`}>
              {modal.type === 'success' ? 'Rezervacija uspešna' : 'Greška'}
            </h3>
            <p className="mt-2 text-gray-200">{modal.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                className="btn-secondary"
                onClick={() => setModal(null)}
              >
                Zatvori
              </button>
              {modal.type === 'success' && (
                <button
                  className="btn-primary"
                  onClick={() => {
                    setModal(null)
                    navigate('/profile')
                  }}
                >
                  OK
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Booking
