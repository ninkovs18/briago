import { useEffect, useMemo, useState } from 'react'
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore'
import { db } from '../../firebase'

// --- Types & Constants ---
type UserDoc = { id?: string; email: string; name?: string; phone?: string }
const empty: UserDoc = { email: '', name: '', phone: '' }

// --- Komponenta AdminUsersPage ---
const AdminUsersPage = () => {
  const [items, setItems] = useState<UserDoc[]>([])
  const [form, setForm] = useState<UserDoc>(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null) // NOVO: Praćenje selektovanog reda
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)


  // 1. Povezivanje sa Firestore-om
  useEffect(() => {
    const ref = collection(db, 'users')
    const unsub = onSnapshot(ref, (snap) => {
      const list: UserDoc[] = []
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as UserDoc) }))
      setItems(list)
    })
    return unsub
  }, [])

  // 2. Čuvanje i Ažuriranje
  const save = async () => {
    if (!form.email.trim()) {
        setError('Email je obavezan.');
        return;
    }
    
    setError(null);
    setLoading(true);

    try {
        const dataToSave = {
            email: form.email.trim(),
            name: form.name?.trim() || '',
            phone: form.phone?.trim() || ''
        };

        if (editingId) {
            await updateDoc(doc(db, 'users', editingId), dataToSave)
        } else {
            await addDoc(collection(db, 'users'), dataToSave)
        }
        
        setForm(empty); 
        setEditingId(null);
        setSelectedUserId(null);

    } catch (err) {
        console.error(err)
        setError('Greška pri čuvanju u Firestore.');
    } finally {
        setLoading(false);
    }
  }
  
  // 3. Brisanje selektovanog korisnika
  const deleteSelected = async () => {
      if (!selectedUserId) return;
      if (!window.confirm('Da li ste sigurni da želite da obrišete ovog korisnika?')) return;

      setLoading(true);
      try {
          await deleteDoc(doc(db, 'users', selectedUserId));
          setSelectedUserId(null);
          setEditingId(null);
          setForm(empty);
      } catch (err) {
          console.error(err);
          setError('Greška pri brisanju iz Firestore.');
      } finally {
          setLoading(false);
      }
  }

  // 4. Prebacivanje u Edit mode
  const startEditing = () => {
      if (!selectedUserId) return;
      const selectedUser = items.find(u => u.id === selectedUserId);
      if (selectedUser) {
          setForm(selectedUser);
          setEditingId(selectedUser.id!);
      }
  }

  const canSave = useMemo(() => form.email && !loading, [form, loading])

  const cancelEdit = () => {
    setForm(empty);
    setEditingId(null);
    setSelectedUserId(null);
    setError(null);
  }

  // --- RENDERING KOMPONENTE ---
  return (
    // Glavni kontejner sa paddingom i pozadinom
    <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Korisnici</h1>

      {/* Grid za responsivnost: 1 kolona na mobilnom, 3 kolone na desktopu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* TABELA KONTEJNER - Zauzima 2/3 širine na desktopu */}
        <div className="lg:col-span-2 bg-white shadow-lg border border-gray-100 rounded-lg overflow-hidden">
          
          <div className="p-4">
              
              {/* ZAGLAVLJE TABELE SA AKCIJAMA */}
              {/* Naslov i dugmad u istom redu (flex items-center) */}
              <div className="flex items-center gap-4 mb-4"> 
                  <h2 className="font-semibold text-lg whitespace-nowrap">Postojeći korisnici</h2> 
                  
                  {/* Dugmad za Edit i Obriši */}
                  <div className="space-x-2 flex">
                      <button
                          onClick={startEditing}
                          disabled={!selectedUserId || editingId !== null || loading}
                          className="text-sm px-3 py-1 rounded font-semibold bg-[#1F50FF] text-white disabled:opacity-50 transition duration-150"
                      >
                          Izmeni
                      </button>
                      <button
                          onClick={deleteSelected}
                          disabled={!selectedUserId || loading}
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
                              <th className="py-3 px-1">Email</th>
                              <th className="py-3 px-1">Ime</th>
                              <th className="py-3 px-1">Telefon</th>
                          </tr>
                      </thead>
                  </table>
                  
                  {/* WRAPPER ZA TELO TABELE - max-h-40 (160px) sa skrolom na malim ekranima */}
                  <div className="max-h-40 overflow-y-auto md:max-h-full md:overflow-y-visible">
                    <table className="min-w-full text-sm">
                        <tbody>
                            {items.map((u) => {
                                const isSelected = u.id === selectedUserId;
                                return (
                                    <tr 
                                        key={u.id} 
                                        // Omogućava selekciju/deselekciju reda i vizuelno ga ističe
                                        className={`border-b border-gray-100 cursor-pointer ${isSelected ? 'bg-blue-50/70 border-blue-200' : 'hover:bg-gray-50'}`}
                                        onClick={() => setSelectedUserId(u.id === selectedUserId ? null : u.id!)}
                                    >
                                        <td className="py-2 px-1 font-medium">{u.email}</td>
                                        <td className="py-2 px-1 text-gray-600">{u.name || '—'}</td>
                                        <td className="py-2 px-1 text-gray-600">{u.phone || '—'}</td>
                                    </tr>
                                )
                            })}

                            {items.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="py-8 text-center text-gray-500">
                                        Nema korisnika.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                  </div>
                  
              </div>
          </div>
        </div>

        {/* FORMA - Zauzima 1/3 širine na desktopu */}
        <div className="bg-white shadow-lg border border-gray-100 rounded-lg p-4">
          <h2 className="font-semibold mb-4 text-xl">
            {editingId ? 'Izmeni korisnika' : 'Dodaj korisnika'}
          </h2>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded mb-4 text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            {/* INPUT: Email */}
            <input 
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              placeholder="Email" 
              value={form.email} 
              onChange={(e)=>setForm({...form, email:e.target.value})} 
              type="email"
            />
            
            {/* INPUT: Ime */}
            <input 
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              placeholder="Ime" 
              value={form.name || ''} 
              onChange={(e)=>setForm({...form, name:e.target.value})} 
              type="text"
            />
            
            {/* INPUT: Telefon */}
            <input 
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              placeholder="Telefon" 
              value={form.phone || ''} 
              onChange={(e)=>setForm({...form, phone:e.target.value.replace(/[^0-9+]/g, '')})} // Dozvoli samo brojeve i znak +
              type="tel"
            />
            
            <div className="flex gap-3 pt-2">
              <button 
                disabled={!canSave} 
                onClick={save} 
                className="flex-1 px-4 py-2 rounded font-semibold bg-[#1F50FF] text-white disabled:opacity-50 transition duration-150 hover:bg-blue-600"
              >
                {loading ? 'Čuvanje...' : editingId? 'Sačuvaj':'Dodaj Korisnika'}
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

export default AdminUsersPage