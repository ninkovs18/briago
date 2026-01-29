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
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Usluge</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABELA KONTEJNER (lg:col-span-2) */}
        <div className="lg:col-span-2 bg-white shadow-lg border border-gray-100 rounded-lg overflow-hidden">
          
          <div className="p-4">
              
              {/* ZAGLAVLJE TABELE SA AKCIJAMA */}
              <div className="flex items-center gap-4 mb-4"> 
                  <h2 className="font-semibold text-lg whitespace-nowrap">Postojeće usluge</h2> 
                  
                  <div className="space-x-2 flex">
                      <button
                          onClick={startEditing}
                          disabled={!selectedServiceId || editingId !== null || loading}
                          className="text-sm px-3 py-1 rounded font-semibold bg-[#1F50FF] text-white disabled:opacity-50 transition duration-150"
                      >
                          Izmeni
                      </button>
                      <button
                          onClick={deleteSelected}
                          disabled={!selectedServiceId || loading}
                          className="text-sm px-3 py-1 rounded font-semibold bg-red-600 text-white disabled:opacity-50 transition duration-150"
                      >
                          Obriši
                      </button>
                  </div>
              </div>

              {/* Tabela */}
              <div className="overflow-x-auto"> 
                  <table className="min-w-full text-sm">
                      {/* ZAGLAVLJE TABELE (<thead>) ostaje fiksno */}
                      <thead>
                          <tr className="text-left border-b border-gray-200 bg-gray-50 text-gray-600">
                              <th className="py-3 px-1">Naziv</th>
                              <th className="py-3 px-1">Cena</th>
                              <th className="py-3 px-1">Trajanje</th>
                          </tr>
                      </thead>
                  </table>
                  
                  {/* NOVO: WRAPPER ZA TELO TABELE - max-h-40 (160px) samo na malim ekranima */}
                  {/* md:max-h-full i md:overflow-y-visible resetuju ograničenja na srednjim i većim ekranima */}
                  <div className="max-h-40 overflow-y-auto md:max-h-full md:overflow-y-visible">
                    <table className="min-w-full text-sm">
                        <tbody>
                            {items.map((s) => {
                                const isSelected = s.id === selectedServiceId;
                                return (
                                    <tr 
                                        key={s.id} 
                                        className={`border-b border-gray-100 cursor-pointer ${isSelected ? 'bg-blue-50/70 border-blue-200' : 'hover:bg-gray-50'}`}
                                        onClick={() => setSelectedServiceId(s.id === selectedServiceId ? null : s.id!)}
                                    >
                                        <td className="py-2 px-1 font-medium">{s.name}</td>
                                        <td className="py-2 px-1 text-gray-600">{s.price} RSD</td>
                                        <td className="py-2 px-1 text-gray-600">{s.duration} min</td>
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
        <div className="bg-white shadow-lg border border-gray-100 rounded-lg p-4">
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