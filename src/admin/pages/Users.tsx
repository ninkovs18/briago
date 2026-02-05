import { useEffect, useMemo, useState } from 'react'
import { createUserWithEmailAndPassword, deleteUser } from 'firebase/auth'
import { collection, getDocs, query, updateDoc, doc, onSnapshot, setDoc, where } from 'firebase/firestore'
import { db, getSecondaryAuth } from '../../firebase'
import { isValidSerbianPhone, normalizePhone } from '../../utils/phone'

// --- Types & Constants ---
type UserDoc = { id?: string; email: string; fullName?: string; phone?: string; verified?: boolean; isAdmin?: boolean; disabled?: boolean }
const empty: UserDoc = { email: '', fullName: '', phone: '' }

// --- Komponenta AdminUsersPage ---
const AdminUsersPage = () => {
  const [items, setItems] = useState<UserDoc[]>([])
  const [form, setForm] = useState<UserDoc>(empty)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null) // NOVO: Praćenje selektovanog reda
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'pending' | 'list' | 'form'>('pending')
  const [pendingTab, setPendingTab] = useState<'pending' | 'deleted'>('pending')


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
    if (!form.fullName?.trim()) {
        setError('Ime i prezime ili nadimak je obavezan.');
        return;
    }
    
    setError(null);
    setLoading(true);

    try {
        const normalizedPhone = normalizePhone(form.phone || '')
        if (form.phone?.trim() && !isValidSerbianPhone(normalizedPhone)) {
          setError('Unesi važeći broj telefona (npr. +381641234567 ili 0641234567).')
          return
        }

        const dataToSave = {
            email: form.email.trim(),
            fullName: form.fullName?.trim() || '',
            phone: normalizedPhone
        };

        const nameSnap = await getDocs(
          query(collection(db, 'users'), where('fullName', '==', dataToSave.fullName))
        )
        const nameTaken = nameSnap.docs.some((d) => d.id !== editingId)
        if (nameTaken) {
          setError('Ime i prezime ili nadimak već postoji. Unesi drugi.')
          return
        }

        if (editingId) {
            const updatePayload = {
              fullName: dataToSave.fullName,
              phone: dataToSave.phone
            }
            await updateDoc(doc(db, 'users', editingId), updatePayload)
        } else {
            const secondaryAuth = getSecondaryAuth()
            const password = 'promeni123'
            const cred = await createUserWithEmailAndPassword(secondaryAuth, dataToSave.email, password)
            try {
              await setDoc(doc(db, 'users', cred.user.uid), {
                ...dataToSave,
                verified: true,
                disabled: false,
                isAdmin: false,
                createdAt: new Date()
              })
            } catch (e) {
              await deleteUser(cred.user)
              throw e
            }
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
  
  const openDelete = (id?: string) => {
    if (!id) return
    setDeleteError(null)
    setDeleteId(id)
  }

  const closeDelete = () => {
    setDeleteId(null)
    setDeleteError(null)
  }

  const confirmDelete = async () => {
    if (!deleteId) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', deleteId), { disabled: true })
      if (selectedUserId === deleteId) {
        setSelectedUserId(null)
        setEditingId(null)
        setForm(empty)
      }
      closeDelete()
    } catch (err) {
      console.error(err)
      setDeleteError('Greška pri brisanju iz Firestore.')
    } finally {
      setLoading(false)
    }
  }

  // 4. Prebacivanje u Edit mode
  const startEditing = () => {
      if (!selectedUserId) return;
      const selectedUser = items.find(u => u.id === selectedUserId);
      if (selectedUser) {
          setForm(selectedUser);
          setEditingId(selectedUser.id!);
          setActiveTab('form');
      }
  }

  const canSave = useMemo(() => form.email && !loading, [form, loading])

  const cancelEdit = () => {
    setForm(empty);
    setEditingId(null);
    setSelectedUserId(null);
    setError(null);
  }

  const verifyUser = async (id?: string) => {
    if (!id) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', id), { verified: true })
    } catch (err) {
      console.error(err)
      setError('Greška pri verifikaciji korisnika.')
    } finally {
      setLoading(false)
    }
  }

  const pendingUsers = useMemo(() => items.filter((u) => !u.isAdmin && !u.disabled && !u.verified), [items])
  const deletedUsers = useMemo(() => items.filter((u) => !u.isAdmin && u.disabled), [items])
  const verifiedUsers = useMemo(() => items.filter((u) => !u.isAdmin && !u.disabled && u.verified), [items])

  const restoreUser = async (id?: string) => {
    if (!id) return
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', id), { disabled: false })
    } catch (err) {
      console.error(err)
      setError('Greška pri vraćanju profila.')
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (id?: string) => {
    if (!id) return
    openDelete(id)
  }

  // --- RENDERING KOMPONENTE ---
  return (
    // Glavni kontejner sa paddingom i pozadinom
    <div className="p-2 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
      
      <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-gray-800">Korisnici</h1>

      {/* Tabs (mobile only) */}
      <div className="mb-3 flex gap-2 sm:hidden">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold ${
            activeTab === 'pending' ? 'bg-[#1F50FF] text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Čekanje
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`flex-1 rounded-md px-3 py-2 text-xs font-semibold ${
            activeTab === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
          }`}
        >
          Korisnici
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

      {/* Grid za responsivnost: 1 kolona na mobilnom, 3 kolone na desktopu */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        
        {/* TABELA KONTEJNER - Zauzima 2/3 širine na desktopu */}
        <div className={`lg:col-span-2 bg-white shadow-lg border border-gray-100 rounded-lg overflow-hidden ${activeTab === 'form' ? 'hidden sm:block' : ''}`}>
          
          <div className="p-3 sm:p-4">
              {/* Pending sub-tabs */}
              <div className={`mb-4 sm:mb-6 ${activeTab === 'list' ? 'hidden sm:block' : ''}`}>
                <div className="mb-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => setPendingTab('pending')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                      pendingTab === 'pending'
                        ? 'bg-[#1F50FF] text-white border-[#1F50FF]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    Na čekanju ({pendingUsers.length})
                  </button>
                  <button
                    onClick={() => setPendingTab('deleted')}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold border ${
                      pendingTab === 'deleted'
                        ? 'bg-[#1F50FF] text-white border-[#1F50FF]'
                        : 'bg-white text-gray-600 border-gray-200'
                    }`}
                  >
                    Obrisani ({deletedUsers.length})
                  </button>
                </div>

                {pendingTab === 'pending' && (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                      <h2 className="font-semibold text-sm sm:text-lg text-gray-900">Korisnici na čekanju verifikacije</h2>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {pendingUsers.length}
                      </span>
                    </div>
                    {pendingUsers.length === 0 ? (
                      <p className="text-sm text-gray-500">Nema korisnika koji čekaju verifikaciju.</p>
                    ) : (
                      <div className="max-h-[260px] overflow-y-auto pr-1">
                        <div className="space-y-2">
                          {pendingUsers.map((u) => (
                            <div key={u.id} className="flex flex-col gap-3 rounded border border-gray-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900 break-words">{u.email}</div>
                                <div className="text-xs text-gray-500">{u.fullName || '—'}</div>
                                <div className="text-xs text-gray-500">{u.phone || '—'}</div>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <button
                                  onClick={() => verifyUser(u.id)}
                                  disabled={loading}
                                  className="text-[10px] sm:text-[11px] px-2 py-1 rounded font-semibold bg-green-600 text-white disabled:opacity-50 w-full sm:w-auto"
                                >
                                  Verifikuj
                                </button>
                                <button
                                  onClick={() => deleteUser(u.id)}
                                  disabled={loading}
                                  className="text-[10px] sm:text-[11px] px-2 py-1 rounded font-semibold bg-red-600 text-white disabled:opacity-50 w-full sm:w-auto"
                                >
                                  Obriši
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {pendingTab === 'deleted' && (
                  <div className="rounded-lg border border-gray-200 bg-white p-3 sm:p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                      <h2 className="font-semibold text-sm sm:text-lg text-gray-900">Obrisani korisnici</h2>
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                        {deletedUsers.length}
                      </span>
                    </div>
                    {deletedUsers.length === 0 ? (
                      <p className="text-sm text-gray-500">Nema obrisanih korisnika.</p>
                    ) : (
                      <div className="max-h-[260px] overflow-y-auto pr-1">
                        <div className="space-y-2">
                          {deletedUsers.map((u) => (
                            <div key={u.id} className="flex flex-col gap-3 rounded border border-gray-200 bg-white px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <div className="text-sm font-medium text-gray-900 break-words">{u.email}</div>
                                <div className="text-xs text-gray-500">{u.fullName || '—'}</div>
                                <div className="text-xs text-gray-500">{u.phone || '—'}</div>
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <button
                                  onClick={() => restoreUser(u.id)}
                                  disabled={loading}
                                  className="text-[10px] sm:text-[11px] px-2 py-1 rounded font-semibold bg-blue-600 text-white disabled:opacity-50 w-full sm:w-auto"
                                >
                                  Vrati profil
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* ZAGLAVLJE TABELE SA AKCIJAMA */}
              {/* Naslov i dugmad u istom redu (flex items-center) */}
              <div className={`flex flex-col gap-3 mb-3 sm:mb-4 border-t border-gray-200 pt-4 sm:pt-5 sm:flex-row sm:items-center sm:gap-4 ${activeTab === 'pending' ? 'hidden sm:flex' : ''}`}> 
                  <h2 className="font-semibold text-base sm:text-lg whitespace-nowrap">Postojeći korisnici</h2> 
                  
                  {/* Dugmad za Edit i Obriši */}
                  <div className="flex flex-wrap gap-2">
                      <button
                          onClick={startEditing}
                          disabled={!selectedUserId || editingId !== null || loading}
                          className="text-[11px] sm:text-sm px-3 py-1 rounded font-semibold bg-[#1F50FF] text-white disabled:opacity-50 transition duration-150 w-full sm:w-auto"
                      >
                          Izmeni
                      </button>
                      <button
                          onClick={() => openDelete(selectedUserId || undefined)}
                          disabled={!selectedUserId || loading}
                          className="text-[11px] sm:text-sm px-3 py-1 rounded font-semibold bg-red-600 text-white disabled:opacity-50 transition duration-150 w-full sm:w-auto"
                      >
                          Obriši
                      </button>
                  </div>
              </div>

              {/* Tabela */}
              <div className={`overflow-x-auto ${activeTab === 'pending' ? 'hidden sm:block' : ''}`}>
                <div className="max-h-[240px] sm:max-h-[260px] overflow-y-auto">
                  <table className="min-w-[320px] w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                  <thead className="bg-gray-50 text-gray-600 uppercase tracking-wide text-xs">
                    <tr className="text-left border-b border-gray-200 divide-x divide-gray-200">
                        <th className="py-3 px-2 sm:px-3">Ime i prezime ili nadimak</th>
                      <th className="py-3 px-2 sm:px-3">Telefon</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {verifiedUsers.map((u) => {
                      const isSelected = u.id === selectedUserId;
                      return (
                        <tr
                          key={u.id}
                          className={`cursor-pointer divide-x divide-gray-200 ${isSelected ? 'bg-blue-50/70' : 'hover:bg-gray-50'}`}
                          onClick={() => setSelectedUserId(u.id === selectedUserId ? null : u.id!)}
                        >
                          <td className="py-3 px-2 sm:px-3 font-medium text-gray-900">{u.fullName || '—'}</td>
                          <td className="py-3 px-2 sm:px-3 text-gray-600">{u.phone || '—'}</td>
                        </tr>
                      )
                    })}

                    {verifiedUsers.length === 0 && (
                      <tr>
                        <td colSpan={2} className="py-8 text-center text-gray-500">
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
        <div className={`bg-white shadow-lg border border-gray-100 rounded-lg p-3 sm:p-4 ${activeTab !== 'form' ? 'hidden sm:block' : ''}`}>
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
              disabled={!!editingId}
            />
            
            {/* INPUT: Ime */}
            <input 
              className="w-full border border-gray-300 rounded px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150"
              placeholder="Ime i prezime ili nadimak" 
              value={form.fullName || ''} 
              onChange={(e)=>setForm({...form, fullName:e.target.value})} 
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
      {deleteId && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 text-[#080E53] shadow-xl">
            <h3 className="text-xl font-semibold">Potvrdi brisanje</h3>
            <p className="mt-2 text-gray-600">
              Da li ste sigurni da želite da obrišete ovog korisnika?
            </p>
            {deleteError && (
              <p className="mt-3 text-sm text-red-600">{deleteError}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button className="px-4 py-2 rounded border" onClick={closeDelete} disabled={loading}>
                Nazad
              </button>
              <button className="px-4 py-2 rounded bg-red-600 text-white" onClick={confirmDelete} disabled={loading}>
                {loading ? 'Brisanje...' : 'Obriši'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsersPage
