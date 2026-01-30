import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  updateDoc,
  deleteDoc
} from 'firebase/firestore'
import { addMinutes, differenceInMinutes, format, startOfWeek } from 'date-fns'
import { db } from '../../firebase'
import ReservationCalendar, { CalendarEvent } from '../components/ReservationCalendar'

export type ReservationDoc = {
  id?: string
  userId: string
  serviceId: string
  date?: string
  startTime?: string
  endTime?: string
  status?: string
  durationMin?: number
}

type UserDoc = { id: string; fullName?: string; email?: string; disabled?: boolean }

type ServiceDoc = { id: string; name: string; duration?: number }

type FormState = {
  userId: string
  serviceId: string
  date: string
  startTime: string
  duration: '30' | '60'
}

const emptyForm: FormState = {
  userId: '',
  serviceId: '',
  date: '',
  startTime: '',
  duration: '30'
}

const AdminReservationsPage = () => {
  const [reservations, setReservations] = useState<ReservationDoc[]>([])
  const [users, setUsers] = useState<UserDoc[]>([])
  const [services, setServices] = useState<ServiceDoc[]>([])
  const [weekStart, setWeekStart] = useState<Date>(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const highlightTimerRef = useRef<number | null>(null)
  const initialLoadRef = useRef(true)

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'reservations'), (snap) => {
      const list: ReservationDoc[] = []
      snap.forEach((d) => {
        const data = d.data() as ReservationDoc
        if (data.status && data.status !== 'active') return
        list.push({ id: d.id, ...data })
      })
      setReservations(list)

      if (!initialLoadRef.current) {
        const added = snap.docChanges().find((c) => c.type === 'added')
        if (added) {
          setHighlightId(added.doc.id)
          if (highlightTimerRef.current) {
            window.clearTimeout(highlightTimerRef.current)
          }
          highlightTimerRef.current = window.setTimeout(() => {
            setHighlightId(null)
            highlightTimerRef.current = null
          }, 3000)
        }
      }

      if (initialLoadRef.current) initialLoadRef.current = false
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserDoc[] = []
      snap.forEach((d) => {
        const data = d.data() as Omit<UserDoc, 'id'>
        if (data.disabled) return
        list.push({ id: d.id, ...data })
      })
      setUsers(list)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'services'), (snap) => {
      const list: ServiceDoc[] = []
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as ServiceDoc) }))
      setServices(list)
    })
    return unsub
  }, [])

  const usersById = useMemo(() => {
    const map = new Map<string, UserDoc>()
    users.forEach((u) => map.set(u.id, u))
    return map
  }, [users])

  const servicesById = useMemo(() => {
    const map = new Map<string, ServiceDoc>()
    services.forEach((s) => map.set(s.id, s))
    return map
  }, [services])

  const toDateTime = (date?: string, time?: string) => {
    if (!date || !time) return null
    if (time.includes('T')) {
      const dt = new Date(time)
      return Number.isNaN(dt.getTime()) ? null : dt
    }
    const dt = new Date(`${date}T${time}`)
    return Number.isNaN(dt.getTime()) ? null : dt
  }

  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map((r) => {
      const start = toDateTime(r.date, r.startTime) ?? new Date()
      const end = toDateTime(r.date, r.endTime) ?? addMinutes(start, r.durationMin ?? 60)
      const user = usersById.get(r.userId)
      const service = servicesById.get(r.serviceId)
      const title = `${user?.fullName || user?.email || 'Korisnik'} · ${service?.name || 'Usluga'}`
      return {
        id: r.id || `${r.userId}-${r.startTime}`,
        title,
        start,
        end,
        color: '#3b82f6'
      }
    })
  }, [reservations, servicesById, usersById])

  const openCreate = (dt: Date) => {
    setEditingId(null)
    setError(null)
    setForm({
      ...emptyForm,
      date: format(dt, 'yyyy-MM-dd'),
      startTime: format(dt, 'HH:mm')
    })
    setModalOpen(true)
  }

  const openEdit = (ev: CalendarEvent) => {
    const res = reservations.find((r) => r.id === ev.id)
    if (!res) return
    const start = ev.start
    const duration = Math.max(30, differenceInMinutes(ev.end, ev.start))
    setEditingId(res.id || null)
    setError(null)
    setForm({
      userId: res.userId || '',
      serviceId: res.serviceId || '',
      date: format(start, 'yyyy-MM-dd'),
      startTime: format(start, 'HH:mm'),
      duration: duration >= 60 ? '60' : '30'
    })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
  }

  const saveReservation = async () => {
    if (!form.userId || !form.serviceId || !form.date || !form.startTime) {
      setError('Popunite sva obavezna polja.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const start = new Date(`${form.date}T${form.startTime}`)
      const duration = Number(form.duration)
      const end = addMinutes(start, duration)
      const payload = {
        userId: form.userId,
        serviceId: form.serviceId,
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
        status: 'active',
        durationMin: duration
      }

      if (editingId) {
        await updateDoc(doc(db, 'reservations', editingId), payload)
      } else {
        const ref = await addDoc(collection(db, 'reservations'), payload)
        setHighlightId(ref.id)
        if (highlightTimerRef.current) {
          window.clearTimeout(highlightTimerRef.current)
        }
        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightId(null)
          highlightTimerRef.current = null
        }, 3000)
      }
      closeModal()
    } catch (e) {
      console.error(e)
      setError('Greška pri čuvanju termina.')
    } finally {
      setSaving(false)
    }
  }

  const deleteReservation = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      await deleteDoc(doc(db, 'reservations', editingId))
      closeModal()
    } catch (e) {
      console.error(e)
      setError('Greška pri brisanju termina.')
    } finally {
      setSaving(false)
    }
  }

  const moveReservation = async (ev: CalendarEvent, nextStart: Date, nextEnd: Date) => {
    const res = reservations.find((r) => r.id === ev.id)
    if (!res?.id) return
    try {
      await updateDoc(doc(db, 'reservations', res.id), {
        date: format(nextStart, 'yyyy-MM-dd'),
        startTime: format(nextStart, 'HH:mm'),
        endTime: format(nextEnd, 'HH:mm')
      })
    } catch (e) {
      console.error(e)
    }
  }

  const userOptions = useMemo(() => {
    return users.map((u) => ({
      id: u.id,
      label: u.fullName || u.email || u.id
    }))
  }, [users])

  const serviceOptions = useMemo(() => {
    return services.map((s) => ({
      id: s.id,
      label: s.name
    }))
  }, [services])

  return (
    <div className="p-2 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Rezervacije</h1>

      <div className="-mx-2 sm:mx-0">
        <div className="bg-white rounded-none sm:rounded-lg border border-gray-100 shadow-lg p-0 sm:p-2">
          <ReservationCalendar
            weekStart={weekStart}
            events={events}
            onPrevWeek={() => setWeekStart(addMinutes(weekStart, -7 * 24 * 60))}
            onNextWeek={() => setWeekStart(addMinutes(weekStart, 7 * 24 * 60))}
            onSlotClick={openCreate}
            onEventClick={openEdit}
            onEventMove={moveReservation}
            minHour={9}
            maxHour={19}
            stepMinutes={30}
            highlightEventId={highlightId}
          />
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Izmeni termin' : 'Novi termin'}
            </h3>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Datum *</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Vreme početka *</label>
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Trajanje *</label>
                <select
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value as FormState['duration'] })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Korisnik *</label>
                <select
                  value={form.userId}
                  onChange={(e) => setForm({ ...form, userId: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Izaberi korisnika</option>
                  {userOptions.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Usluga *</label>
                <select
                  value={form.serviceId}
                  onChange={(e) => setForm({ ...form, serviceId: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Izaberi uslugu</option>
                  {serviceOptions.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}
            </div>

            <div className="mt-5 flex justify-end gap-2">
              {editingId && (
                <button
                  onClick={deleteReservation}
                  disabled={saving}
                  className="px-3 py-2 rounded border border-red-200 text-red-600"
                >
                  Obriši
                </button>
              )}
              <button onClick={closeModal} className="px-3 py-2 rounded border" disabled={saving}>
                Nazad
              </button>
              <button
                onClick={saveReservation}
                disabled={saving}
                className="px-3 py-2 rounded bg-[#1F50FF] text-white"
              >
                {saving ? 'Čuvanje...' : 'Sačuvaj'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminReservationsPage
