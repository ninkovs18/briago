import { useEffect, useMemo, useRef, useState } from 'react'
import { Combobox } from '@headlessui/react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  Timestamp,
  where
} from 'firebase/firestore'
import { addMinutes, differenceInMinutes, format, startOfWeek } from 'date-fns'
import { db } from '../../firebase'
import ReservationCalendar, { CalendarEvent } from '../components/ReservationCalendar'
import {
  defaultWorkingHours,
  getDayConfig,
  isDateInVacation,
  isWithinWorkingHours,
  normalizeWorkingHours,
  WorkingHours
} from '../../utils/workingHours'

export type ReservationDoc = {
  id?: string
  userId?: string | null
  serviceId?: string | null
  kind?: 'user' | 'guest' | 'break'
  guestName?: string
  date?: string
  startTime?: string
  endTime?: string
  durationMin?: number
}

type UserDoc = {
  id: string
  fullName?: string
  email?: string
  disabled?: boolean
  verified?: boolean
}

type ServiceDoc = { id: string; name: string; duration?: number }

type FormState = {
  kind: 'user' | 'guest' | 'break'
  userId: string
  serviceId: string
  guestName: string
  date: string
  startTime: string
  duration: '30' | '60'
}

const emptyForm: FormState = {
  kind: 'user',
  userId: '',
  serviceId: '',
  guestName: '',
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
  const [loadingReservations, setLoadingReservations] = useState<boolean>(true)
  const highlightTimerRef = useRef<number | null>(null)
  const initialLoadRef = useRef(true)
  const [userQuery, setUserQuery] = useState('')
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours)

  useEffect(() => {
    const start = weekStart
    const end = addMinutes(start, 6 * 24 * 60)
    const startStr = format(start, 'yyyy-MM-dd')
    const endStr = format(end, 'yyyy-MM-dd')
    const q = query(
      collection(db, 'reservations'),
      where('date', '>=', startStr),
      where('date', '<=', endStr)
    )
    setLoadingReservations(true)
    const unsub = onSnapshot(q, (snap) => {
      const list: ReservationDoc[] = []
      snap.forEach((d) => {
        const data = d.data() as ReservationDoc
        list.push({ ...data, id: d.id })
      })
      setReservations(list)
      setLoadingReservations(false)

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
  }, [weekStart])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      const list: UserDoc[] = []
      snap.forEach((d) => {
        const data = d.data() as Omit<UserDoc, 'id'>
        if (data.disabled) return
        if (!data.verified) return
        list.push({ id: d.id, ...data })
      })
      setUsers(list)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'services'), (snap) => {
      const list: ServiceDoc[] = []
      snap.forEach((d) => list.push({ ...(d.data() as Omit<ServiceDoc, 'id'>), id: d.id }))
      setServices(list)
    })
    return unsub
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'workingHours'), (snap) => {
      if (snap.exists()) {
        setWorkingHours(normalizeWorkingHours(snap.data() as WorkingHours))
      } else {
        setWorkingHours(defaultWorkingHours)
      }
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

  const buildSlotId = (date: string, time: string) => `${date}_${time}`

  const events: CalendarEvent[] = useMemo(() => {
    return reservations.map((r) => {
      const start = toDateTime(r.date, r.startTime) ?? new Date()
      const end = toDateTime(r.date, r.endTime) ?? addMinutes(start, r.durationMin ?? 60)
      const kind = r.kind ?? (r.userId ? 'user' : r.guestName ? 'guest' : 'break')
      const user = r.userId ? usersById.get(r.userId) : undefined
      const service = r.serviceId ? servicesById.get(r.serviceId) : undefined
      const title =
        kind === 'break'
          ? 'Pauza'
          : kind === 'guest'
            ? `${r.guestName || 'Guest'} · ${service?.name || 'Usluga'}`
            : `${user?.fullName || user?.email || 'Korisnik'} · ${service?.name || 'Usluga'}`
      return {
        id: r.id || `${r.userId || r.guestName || 'break'}-${r.startTime || 'time'}`,
        title,
        start,
        end,
        color: kind === 'break' ? '#6b7280' : kind === 'guest' ? '#60a5fa' : '#3b82f6'
      }
    })
  }, [reservations, servicesById, usersById])

  const openCreate = (dt: Date) => {
    setEditingId(null)
    setError(null)
    setForm({
      ...emptyForm,
      kind: 'user',
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
    const kind = res.kind ?? (res.userId ? 'user' : res.guestName ? 'guest' : 'break')
    setEditingId(res.id || null)
    setError(null)
    setForm({
      kind,
      userId: res.userId || '',
      serviceId: res.serviceId || '',
      guestName: res.guestName || '',
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
    if (!form.date || !form.startTime) {
      setError('Popunite sva obavezna polja.')
      return
    }
    if (form.kind !== 'break' && !form.serviceId) {
      setError('Izaberite uslugu.')
      return
    }
    if (form.kind === 'user' && !form.userId) {
      setError('Izaberite korisnika.')
      return
    }
    if (form.kind === 'guest' && !form.guestName.trim()) {
      setError('Unesite ime gosta.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const start = new Date(`${form.date}T${form.startTime}`)
      const duration = Number(form.duration)
      const end = addMinutes(start, duration)
      const expireAtDate = new Date(`${form.date}T00:00:00`)
      expireAtDate.setDate(expireAtDate.getDate() + 90)
      if (isDateInVacation(start, workingHours)) {
        setError('Salon je na odmoru u izabranom periodu.')
        return
      }
      const dayConfig = getDayConfig(start, workingHours)
      if (!isWithinWorkingHours(dayConfig, format(start, 'HH:mm'), duration)) {
        setError('Termin je van radnog vremena.')
        return
      }
      const payload = {
        kind: form.kind,
        userId: form.kind === 'user' ? form.userId : null,
        guestName: form.kind === 'guest' ? form.guestName.trim() : null,
        serviceId: form.kind === 'break' ? null : form.serviceId,
        date: format(start, 'yyyy-MM-dd'),
        startTime: format(start, 'HH:mm'),
        endTime: format(end, 'HH:mm'),
        durationMin: duration,
        expireAt: Timestamp.fromDate(expireAtDate)
      }

      if (editingId) {
        const existing = reservations.find((r) => r.id === editingId)
        const oldSlotId =
          existing?.date && existing?.startTime ? buildSlotId(existing.date, existing.startTime) : null
        const newSlotId = buildSlotId(payload.date, payload.startTime)

        await runTransaction(db, async (tx) => {
          const resRef = doc(db, 'reservations', editingId)
          if (oldSlotId && oldSlotId !== newSlotId) {
            const newSlotRef = doc(db, 'slots', newSlotId)
            const newSlotSnap = await tx.get(newSlotRef)
            if (newSlotSnap.exists()) {
              throw new Error('SLOT_TAKEN')
            }
            tx.set(newSlotRef, {
              date: payload.date,
              startTime: payload.startTime,
              reservationId: editingId,
              updatedAt: new Date()
            })
            tx.delete(doc(db, 'slots', oldSlotId))
          }
          tx.update(resRef, payload)
        })
      } else {
        const createdId = await runTransaction(db, async (tx) => {
          const newSlotId = buildSlotId(payload.date, payload.startTime)
          const slotRef = doc(db, 'slots', newSlotId)
          const slotSnap = await tx.get(slotRef)
          if (slotSnap.exists()) {
            throw new Error('SLOT_TAKEN')
          }
          const resRef = doc(collection(db, 'reservations'))
          tx.set(slotRef, {
            date: payload.date,
            startTime: payload.startTime,
            reservationId: resRef.id,
            createdAt: new Date()
          })
          tx.set(resRef, payload)
          return resRef.id
        })
        setHighlightId(createdId)
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
      if (e instanceof Error && e.message === 'SLOT_TAKEN') {
        setError('Termin je već zauzet. Izaberite drugo vreme.')
      } else {
        setError('Greška pri čuvanju termina.')
      }
    } finally {
      setSaving(false)
    }
  }

  const deleteReservation = async () => {
    if (!editingId) return
    setSaving(true)
    try {
      const existing = reservations.find((r) => r.id === editingId)
      const slotId =
        existing?.date && existing?.startTime ? buildSlotId(existing.date, existing.startTime) : null
      await runTransaction(db, async (tx) => {
        tx.delete(doc(db, 'reservations', editingId))
        if (slotId) {
          tx.delete(doc(db, 'slots', slotId))
        }
      })
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
      const nextDate = format(nextStart, 'yyyy-MM-dd')
      const nextTime = format(nextStart, 'HH:mm')
      const nextEndTime = format(nextEnd, 'HH:mm')
      const expireAtDate = new Date(`${nextDate}T00:00:00`)
      expireAtDate.setDate(expireAtDate.getDate() + 90)
      const duration = Math.max(30, differenceInMinutes(nextEnd, nextStart))
      if (isDateInVacation(nextStart, workingHours)) {
        setError('Salon je na odmoru u izabranom periodu.')
        return
      }
      const dayConfig = getDayConfig(nextStart, workingHours)
      if (!isWithinWorkingHours(dayConfig, nextTime, duration)) {
        setError('Termin je van radnog vremena.')
        return
      }
      const oldSlotId =
        res.date && res.startTime ? buildSlotId(res.date, res.startTime) : null
      const newSlotId = buildSlotId(nextDate, nextTime)

      await runTransaction(db, async (tx) => {
        const resRef = doc(db, 'reservations', res.id!)
        if (oldSlotId && oldSlotId !== newSlotId) {
          const newSlotRef = doc(db, 'slots', newSlotId)
          const newSlotSnap = await tx.get(newSlotRef)
          if (newSlotSnap.exists()) {
            throw new Error('SLOT_TAKEN')
          }
          tx.set(newSlotRef, {
            date: nextDate,
            startTime: nextTime,
            reservationId: res.id,
            updatedAt: new Date()
          })
          tx.delete(doc(db, 'slots', oldSlotId))
        }
        tx.update(resRef, {
          date: nextDate,
          startTime: nextTime,
          endTime: nextEndTime,
          expireAt: Timestamp.fromDate(expireAtDate)
        })
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

  const selectedUser = useMemo(() => {
    if (!form.userId) return null
    return userOptions.find((u) => u.id === form.userId) ?? null
  }, [form.userId, userOptions])

  const filteredUserOptions = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return userOptions
    return userOptions.filter((u) => u.label.toLowerCase().includes(q))
  }, [userOptions, userQuery])

  const serviceOptions = useMemo(() => {
    return services.map((s) => ({
      id: s.id,
      label: s.name
    }))
  }, [services])

  const { minHour, maxHour } = useMemo(() => {
    const openDays = Object.values(workingHours.days).filter((d) => d.isOpen)
    if (openDays.length === 0) return { minHour: 8, maxHour: 20 }
    const min = Math.min(...openDays.map((d) => Number(d.open.split(':')[0] || 0)))
    const max = Math.max(...openDays.map((d) => Number(d.close.split(':')[0] || 24)))
    return { minHour: min, maxHour: max }
  }, [workingHours.days])

  return (
    <div className="p-2 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Rezervacije</h1>

      <div className="-mx-2 sm:mx-0">
        <div className="bg-white rounded-none sm:rounded-lg border border-gray-100 shadow-lg p-0 sm:p-2">
          {loadingReservations && (
            <div className="px-4 py-3 text-sm text-gray-500">Učitavanje rezervacija...</div>
          )}
          <ReservationCalendar
            weekStart={weekStart}
            events={events}
            onPrevWeek={() => setWeekStart(addMinutes(weekStart, -7 * 24 * 60))}
            onNextWeek={() => setWeekStart(addMinutes(weekStart, 7 * 24 * 60))}
            onSlotClick={openCreate}
          onEventClick={openEdit}
          onEventMove={moveReservation}
          minHour={minHour}
          maxHour={maxHour}
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tip *</label>
                <select
                  value={form.kind}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      kind: e.target.value as FormState['kind'],
                      userId: e.target.value === 'user' ? form.userId : '',
                      guestName: e.target.value === 'guest' ? form.guestName : '',
                      serviceId: e.target.value === 'break' ? '' : form.serviceId
                    })
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="user">Korisnik</option>
                  <option value="guest">Guest</option>
                  <option value="break">Pauza</option>
                </select>
              </div>

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

              {form.kind === 'user' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Korisnik *</label>
                  <Combobox
                    value={selectedUser}
                    onChange={(u) => {
                      setForm({ ...form, userId: u?.id ?? '' })
                      setUserQuery('')
                    }}
                  >
                    <div className="relative">
                      <Combobox.Input
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                        displayValue={(u: { id: string; label: string } | null) => u?.label ?? ''}
                        onChange={(e) => {
                          setUserQuery(e.target.value)
                          if (form.userId) setForm({ ...form, userId: '' })
                        }}
                        placeholder="Izaberi korisnika"
                      />
                      <Combobox.Options className="absolute z-10 mt-1 max-h-56 w-full overflow-auto rounded border border-gray-200 bg-white text-sm shadow-lg">
                        {filteredUserOptions.length === 0 ? (
                          <div className="px-3 py-2 text-gray-500">Nema rezultata</div>
                        ) : (
                          filteredUserOptions.map((u) => (
                            <Combobox.Option
                              key={u.id}
                              value={u}
                              className={({ active }) =>
                                `cursor-pointer px-3 py-2 ${active ? 'bg-blue-50 text-blue-700' : 'text-gray-700'}`
                              }
                            >
                              {u.label}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    </div>
                  </Combobox>
                </div>
              )}

              {form.kind === 'guest' && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Ime gosta *</label>
                  <input
                    type="text"
                    value={form.guestName}
                    onChange={(e) => setForm({ ...form, guestName: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ime i prezime / nadimak"
                  />
                </div>
              )}

              {form.kind !== 'break' && (
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
              )}

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
