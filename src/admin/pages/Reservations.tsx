import { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp } from 'firebase/firestore'
import { db } from '../../firebase'
import ReservationCalendar, { CalendarEvent } from '../components/ReservationCalendar'
import { addMinutes, parse, parseISO } from 'date-fns'

export type Reservation = {
  id?: string
  service: string
  date: string
  time: string
  name: string
  phone: string
  notes?: string
  durationMin?: number
  createdAt?: any
}

const empty: Reservation = { service: '', date: '', time: '', name: '', phone: '', notes: '' }

const ReservationsPage = () => {
  const [items, setItems] = useState<Reservation[]>([])
  const [form, setForm] = useState<Reservation>(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [weekStart, setWeekStart] = useState<Date>(new Date())
  const [modalOpen, setModalOpen] = useState(false)

  useEffect(() => {
    const ref = collection(db, 'reservations')
    const unsub = onSnapshot(ref, (snap) => {
      const list: Reservation[] = []
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }))
      if (list.length === 0) {
        setItems(generateMockReservations(new Date()))
      } else {
        setItems(list)
      }
    })
    return unsub
  }, [])

  const reset = () => { setForm(empty); setEditingId(null); setModalOpen(false) }

  const save = async () => {
    if (editingId) {
      await updateDoc(doc(db, 'reservations', editingId), form as any)
    } else {
      await addDoc(collection(db, 'reservations'), { ...form, createdAt: serverTimestamp() })
    }
    reset()
  }

  const startEdit = (r: Reservation) => {
    setEditingId(r.id!)
    setForm({ ...r })
    setModalOpen(true)
  }

  const remove = async (id?: string) => {
    if (!id) return
    await deleteDoc(doc(db, 'reservations', id))
  }

  const canSave = useMemo(() => form.service && form.date && form.time && form.name && form.phone, [form])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const inferDurationMinutes = (service: string) => {
    if (/90/.test(service)) return 90
    if (/75/.test(service)) return 75
    if (/45/.test(service)) return 45
    if (/30/.test(service)) return 30
    return 60
  }

  const toEvents: CalendarEvent[] = useMemo(() => {
    return items.map((r) => {
      // Parse date YYYY-MM-DD and time like "2:30 PM"
      const day = parseISO(r.date)
      const hhmm = parse(r.time, 'h:mm a', day)
      console.log(hhmm)
      const start = hhmm
      const duration = r.durationMin ?? inferDurationMinutes(r.service)
      const end = addMinutes(start, duration)
      return {
        id: r.id || `${r.date}-${r.time}`,
        title: `${r.service} — ${r.name}`,
        start,
        end,
        color: '#7c3aed' // purple card; could map by service
      }
    })
  }, [items])

  const onSlotClick = (dt: Date) => {
    const hh = dt.getHours()
    const mm = String(dt.getMinutes()).padStart(2, '0')
    setForm({
      ...empty,
      date: dt.toISOString().slice(0,10),
      time: `${((hh + 11) % 12) + 1}:${mm} ${hh >= 12 ? 'PM' : 'AM'}`,
      durationMin: 60
    })
    setEditingId(null)
    setModalOpen(true)
  }

  const onEventClick = (ev: CalendarEvent) => {
    const found = items.find((r) => (r.id || '') === ev.id)
    if (found) startEdit(found)
  }

  return (
    <div className="relative">
      <h1 className="text-2xl font-bold mb-4">Reservations</h1>

      <div className="grid grid-cols-1 gap-6">
        <div className="">
          <ReservationCalendar
            weekStart={weekStart}
            events={toEvents}
            onPrevWeek={() => setWeekStart(new Date(weekStart.getTime() - 7*24*60*60*1000))}
            onNextWeek={() => setWeekStart(new Date(weekStart.getTime() + 7*24*60*60*1000))}
            onSlotClick={onSlotClick}
            onEventClick={onEventClick}
          />
        </div>
      </div>

      {/* Modal for create/edit details */}
      {modalOpen && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">{editingId ? 'Edit reservation' : 'New reservation'}</h2>
              <button onClick={reset} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <input className="w-full border rounded px-3 py-2" name="date" placeholder="YYYY-MM-DD" value={form.date} onChange={handleChange} />
                <input className="w-full border rounded px-3 py-2" name="time" placeholder="2:30 PM" value={form.time} onChange={handleChange} />
              </div>
              <input className="w-full border rounded px-3 py-2" name="name" placeholder="Full name" value={form.name} onChange={handleChange} />
              <input className="w-full border rounded px-3 py-2" name="phone" placeholder="Phone" value={form.phone} onChange={handleChange} />
              <input className="w-full border rounded px-3 py-2" name="service" placeholder="Service" value={form.service} onChange={handleChange} />
              <textarea className="w-full border rounded px-3 py-2" name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} />
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              {editingId && <button onClick={() => { remove(editingId!); reset() }} className="px-4 py-2 rounded bg-red-500 text-white">Delete</button>}
              <button onClick={reset} className="px-4 py-2 rounded border">Cancel</button>
              <button disabled={!canSave} onClick={save} className="px-4 py-2 rounded bg-[#1F50FF] text-white disabled:opacity-50">{editingId ? 'Update' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function generateMockReservations(base: Date): Reservation[] {
  const d = new Date(base)
  // set to Monday of current week
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - ((day + 6) % 7))

  const fmtDate = (dt: Date) => dt.toISOString().slice(0,10)
  const time = (h: number, m: number, am = true) => `${((h + 11) % 12) + 1}:${String(m).padStart(2,'0')} ${am ? 'AM' : 'PM'}`

  const mk = (offsetDays: number, h24: number, min: number, name: string, service: string): Reservation => {
    const dt = new Date(monday)
    dt.setDate(monday.getDate() + offsetDays)
    return {
      service,
      date: fmtDate(dt),
      time: time(h24 % 12, min, h24 < 12),
      name,
      phone: '0641234567',
      notes: ''
    }
  }

  return [
    mk(0, 12, 0, 'Marko', 'Classic haircut 60'),
    mk(1, 9, 30, 'Jelena', 'Beard trim 30'),
    mk(1, 14, 0, 'Milan', 'Hot towel shave 60'),
    mk(3, 15, 0, 'Ana', 'Hair & beard combo 60'),
    mk(5, 13, 0, 'Vuk', 'Hair wash & style 30')
  ]
}

export default ReservationsPage
