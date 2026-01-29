import React, { createContext, useContext, useEffect, useState } from 'react'
import { 
  User,
  UserCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'

interface AuthContextType {
  currentUser: User | null
  isAdmin: boolean
  roleLoading: boolean
  login: (email: string, password: string) => Promise<UserCredential>
  signup: (email: string, password: string) => Promise<UserCredential>
  logout: () => Promise<void>
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export const useAuth = () => {
  return useContext(AuthContext)
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [roleLoading, setRoleLoading] = useState<boolean>(false)

  const signup = (email: string, password: string) => {
    return createUserWithEmailAndPassword(auth, email, password)
  }

  const login = (email: string, password: string) => {
    return signInWithEmailAndPassword(auth, email, password)
  }

  const logout = () => {
    return signOut(auth)
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user)
      if (user) {
        setRoleLoading(true)
        try {
          const ref = doc(db, 'users', user.uid)
          const snap = await getDoc(ref)
          setIsAdmin(!!snap.data()?.isAdmin)
        } catch (e) {
          console.error('Failed to load user role', e)
          setIsAdmin(false)
        } finally {
          setRoleLoading(false)
        }
      } else {
        setIsAdmin(false)
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const value: AuthContextType = {
    currentUser,
    isAdmin,
    roleLoading,
    login,
    signup,
    logout,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
