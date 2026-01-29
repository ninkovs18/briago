import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Services from './pages/Services'
import Booking from './pages/Booking'
import Profile from './pages/Profile'
import Login from './pages/Login'
import Registration from './pages/Registration'
import AdminLayout from './admin/AdminLayout'
import ReservationsPage from './admin/pages/Reservations'
import AdminUsersPage from './admin/pages/Users'
import AdminServicesPage from './admin/pages/Services'
import ProtectedRoute from './components/ProtectedRoute'
import AdminRoute from './components/AdminRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-barbershop-dark text-white">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/services" element={<Services />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/booking" element={<Booking />} />
              <Route path="/profile" element={<Profile />} />
            </Route>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Registration />} />

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<ReservationsPage />} />
                <Route path="reservations" element={<ReservationsPage />} />
                <Route path="services" element={<AdminServicesPage />} />
                <Route path="users" element={<AdminUsersPage />} />
              </Route>
            </Route>
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
