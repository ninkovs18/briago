import { useEffect, useMemo, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { defaultWorkingHours, normalizeWorkingHours, WorkingHours } from '../../utils/workingHours'

const dayLabels = [
  { key: '1', label: 'Ponedeljak' },
  { key: '2', label: 'Utorak' },
  { key: '3', label: 'Sreda' },
  { key: '4', label: 'Četvrtak' },
  { key: '5', label: 'Petak' },
  { key: '6', label: 'Subota' },
  { key: '0', label: 'Nedelja' }
]

const AdminSettingsPage = () => {
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'workingHours'), (snap) => {
      if (snap.exists()) {
        setWorkingHours(normalizeWorkingHours(snap.data() as WorkingHours))
      } else {
        setWorkingHours(defaultWorkingHours)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  const canSave = useMemo(() => !loading && !saving, [loading, saving])

  const updateDay = (key: string, patch: Partial<WorkingHours['days'][string]>) => {
    setWorkingHours((prev) => ({
      days: {
        ...prev.days,
        [key]: {
          ...prev.days[key],
          ...patch
        }
      },
      vacation: prev.vacation
    }))
  }

  const save = async () => {
    setMessage(null)
    setSaving(true)
    try {
      await setDoc(doc(db, 'settings', 'workingHours'), workingHours, { merge: true })
      setMessage('Radno vreme je sačuvano.')
    } catch (e) {
      console.error(e)
      setMessage('Greška pri čuvanju radnog vremena.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-2 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      <div className="mb-6 flex justify-end">
        <button
          onClick={save}
          disabled={!canSave}
          className="px-4 py-2 rounded font-semibold bg-[#1F50FF] text-white disabled:opacity-50"
        >
          {saving ? 'Čuvanje...' : 'Sačuvaj'}
        </button>
      </div>

      {message && (
        <div className="mb-4 rounded-md border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700">
          {message}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2">
          {dayLabels.map((day) => {
            const config = workingHours.days[day.key]
            return (
              <div key={day.key} className="border-b border-gray-100 p-4 md:border-b-0 md:border-r md:last:border-r-0">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold text-gray-800">{day.label}</div>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={config?.isOpen ?? true}
                      onChange={(e) => updateDay(day.key, { isOpen: e.target.checked })}
                    />
                    Otvoreno
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Od</label>
                    <input
                      type="time"
                      value={config?.open ?? '09:00'}
                      onChange={(e) => updateDay(day.key, { open: e.target.value })}
                      className="native-datetime-input w-full min-w-0 max-w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      disabled={!config?.isOpen}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Do</label>
                    <input
                      type="time"
                      value={config?.close ?? '17:00'}
                      onChange={(e) => updateDay(day.key, { close: e.target.value })}
                      className="native-datetime-input w-full min-w-0 max-w-full rounded border border-gray-300 px-3 py-2 text-sm"
                      disabled={!config?.isOpen}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Odmor</h2>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="checkbox"
            checked={workingHours.vacation?.enabled ?? false}
            onChange={(e) =>
              setWorkingHours((prev) => ({
                ...prev,
                vacation: {
                  enabled: e.target.checked,
                  from: e.target.checked ? prev.vacation?.from ?? '' : '',
                  to: e.target.checked ? prev.vacation?.to ?? '' : ''
                }
              }))
            }
          />
          <span className="text-sm text-gray-700">Uključi odmor</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Od</label>
            <input
              type="date"
              value={workingHours.vacation?.from ?? ''}
              onChange={(e) =>
                setWorkingHours((prev) => ({
                  ...prev,
                  vacation: {
                    enabled: prev.vacation?.enabled ?? false,
                    from: e.target.value,
                    to: prev.vacation?.to ?? ''
                  }
                }))
              }
              className="native-datetime-input w-full min-w-0 max-w-full rounded border border-gray-300 px-3 py-2 text-sm"
              disabled={!workingHours.vacation?.enabled}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Do</label>
            <input
              type="date"
              value={workingHours.vacation?.to ?? ''}
              onChange={(e) =>
                setWorkingHours((prev) => ({
                  ...prev,
                  vacation: {
                    enabled: prev.vacation?.enabled ?? false,
                    from: prev.vacation?.from ?? '',
                    to: e.target.value
                  }
                }))
              }
              className="native-datetime-input w-full min-w-0 max-w-full rounded border border-gray-300 px-3 py-2 text-sm"
              disabled={!workingHours.vacation?.enabled}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminSettingsPage
