import { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

// --- Types & Constants ---
type Service = { 
  id?: string; 
  name: string; 
  price: string; 
  duration: string; 
  description?: string 
}

const empty: Service = { name: '', price: '', duration: '', description: '' }
const DURATIONS = [
  { value: "30", label: "30 min" },
  { value: "60", label: "60 min" }
];

// --- Komponenta AdminServicesPage ---
const AdminServicesPage = () => {
  const [items, setItems] = useState<Service[]>([])
  const [form, setForm] = useState<Service>(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null) 
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'list' | 'form'>('list')

  // 1. Povezivanje sa Firestore-om
  useEffect(() => {
    const ref = collection(db, 'services')
    const unsub = onSnapshot(ref, (snap) => {
      const list: Service[] = []
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as Service) }))
      setItems(list)
    })
    return unsub
  }, [])

  // 2. Validacija
  const validate = () => {
    if (!form.name.trim()) return 'Naziv je obavezan.'
    if (!form.price.trim()) return 'Cena je obavezna.'
    if (isNaN(Number(form.price))) return 'Cena mora biti broj.'
    if (Number(form.price) <= 0) return 'Cena mora biti veća od nule.'
    if (!DURATIONS.map(d => d.value).includes(form.duration)) return 'Morate izabrati trajanje termina.'
    return null
  }

  // 3. Čuvanje i Ažuriranje
  const save = async () => {
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setLoading(true)

    const normalizedData = {
      name: form.name.trim(),
      price: Number(form.price),
      duration: Number(form.duration),
      description: form.description?.trim() || ''
    }

    try {
      if (editingId) {
        await updateDoc(doc(db, 'services', editingId), normalizedData)
      } else {
        await addDoc(collection(db, 'services'), normalizedData)
      }

      setForm(empty)
      setEditingId(null)
      setSelectedServiceId(null)

    } catch (err) {
      console.error(err)
      setError(`Greška pri čuvanju u Firestore: ${err instanceof Error ? err.message : 'Nepoznata greška'}`)
    } finally {
      setLoading(false)
    }
  }

  // 4. Brisanje selektovane usluge
  const deleteSelected = async () => {
      if (!selectedServiceId) return;
      if (!window.confirm('Da li ste sigurni da želite da obrišete ovu uslugu?')) return;

      setLoading(true);
      try {
          await deleteDoc(doc(db, 'services', selectedServiceId));
          setSelectedServiceId(null);
          setEditingId(null); 
          setForm(empty);
      } catch (err) {
          console.error(err);
          setError('Greška pri brisanju iz Firestore.');
      } finally {
          setLoading(false);
      }
  }
  
  // 5. Prebacivanje u Edit mode
  const startEditing = () => {
      if (!selectedServiceId) return;
      const selectedService = items.find(s => s.id === selectedServiceId);
      if (selectedService) {
          setForm(selectedService);
          setEditingId(selectedService.id!);
          setActiveTab('form');
      }
  }

  const canSave = useMemo(() => {
    return form.name && form.price && form.duration
  }, [form])
  
  const cancelEdit = () => {
    setForm(empty);
    setEditingId(null);
    setError(null);
    setSelectedServiceId(null);
  }


  // --- RENDERING KOMPONENTE ---
  return (
    <div className="h-full min-h-0 box-border p-2 sm:p-6 md:p-8 bg-gray-50 flex flex-col overflow-hidden">
      {/* Tabs (mobile only) */}
      <div className="mb-3 flex gap-2 sm:hidden">
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold ${
            activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => setActiveTab('form')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold ${
            activeTab === 'form' ? 'bg-[#1F50FF] text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Forma
        </button>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* TABELA KONTEJNER (lg:col-span-2) */}
        <div className={`lg:col-span-2 bg-white shadow-lg border border-gray-100 rounded-lg overflow-hidden min-h-0 flex flex-col ${activeTab !== 'list' ? 'hidden sm:flex' : 'flex'}`}>
          
          <div className="p-3 sm:p-4 min-h-0 flex flex-col">
              
              {/* ZAGLAVLJE TABELE SA AKCIJAMA */}
              <div className="flex flex-col gap-3 mb-3 sm:mb-4 sm:flex-row sm:items-center sm:gap-4"> 
                  <h2 className="font-semibold text-base sm:text-lg whitespace-nowrap">Postojeće usluge</h2> 
                  
                  <div className="flex flex-wrap items-center justify-center gap-2">
                      <button
                          onClick={startEditing}
                          disabled={!selectedServiceId || editingId !== null || loading}
                          className="text-xs sm:text-sm min-w-[104px] px-2 py-2 rounded font-semibold bg-[#1F50FF] text-white disabled:opacity-50 transition duration-150"
                      >
                          Izmeni
                      </button>
                      <button
                          onClick={deleteSelected}
                          disabled={!selectedServiceId || loading}
                          className="text-xs sm:text-sm min-w-[104px] px-2 py-2 rounded font-semibold bg-red-600 text-white disabled:opacity-50 transition duration-150"
                      >
                          Obriši
                      </button>
                  </div>
              </div>

              {/* Tabela */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto overflow-x-hidden">
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
                      <tr className="text-left border-b border-gray-200 divide-x divide-gray-200">
                        <th className="py-3 px-2 sm:px-3">Naziv</th>
                        <th className="py-3 px-2 sm:px-3">Cena</th>
                        <th className="py-3 px-2 sm:px-3">Trajanje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((s) => {
                        const isSelected = s.id === selectedServiceId;
                        return (
                          <tr
                            key={s.id}
                            className={`cursor-pointer divide-x divide-gray-200 ${isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'}`}
                            onClick={() => setSelectedServiceId(s.id === selectedServiceId ? null : s.id!)}
                          >
                            <td className="py-3 px-2 sm:px-3 font-medium text-gray-900">{s.name}</td>
                            <td className="py-3 px-2 sm:px-3 text-gray-600">{s.price} RSD</td>
                            <td className="py-3 px-2 sm:px-3 text-gray-600">{s.duration} min</td>
                          </tr>
                        )
                      })}

                      {items.length === 0 && (
                        <tr>
                          <td colSpan={3} className="py-8 text-center text-gray-500">
                            Nema usluga za sad.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
          </div>
        </div>

        {/* FORMA (Isto kao pre) */}
        <div className={`bg-white shadow-lg border border-gray-100 rounded-lg p-3 sm:p-4 ${activeTab !== 'form' ? 'hidden sm:block' : ''}`}>
          <h2 className="font-semibold mb-4 text-xl">
            {editingId ? 'Promeni uslugu' : 'Dodaj uslugu'}
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <input
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              placeholder="Naziv"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              type="text"
            />
            <input
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              placeholder="Cena (npr. 1400)"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value.replace(/[^0-9.]/g, '') })}
              type="text"
            />
            <select
              className="w-full border border-gray-300 rounded px-4 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 appearance-none"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
            >
              <option value="" disabled>Izaberi trajanje termina</option>
              {DURATIONS.map(d => (
                <option key={d.value} value={d.value}>
                  {d.label}
                </option>
              ))}
            </select>
            <textarea
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 min-h-[100px]"
              placeholder="Opis (opciono)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <div className="flex gap-3 pt-2">
              <button
                disabled={!canSave || loading}
                onClick={save}
                className="flex-1 px-4 py-2 rounded font-semibold bg-[#1F50FF] text-white disabled:opacity-50 transition duration-150 hover:bg-blue-600"
              >
                {loading ? 'Čuvanje...' : editingId ? 'Sačuvaj promene' : 'Dodaj uslugu'}
              </button>

              {editingId && (
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 rounded font-semibold border border-gray-300 text-gray-700 hover:bg-gray-100 transition duration-150"
                >
                  Otkaži
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminServicesPage
