import { useAuth } from '../contexts/AuthContext'
import { Navigate } from 'react-router-dom'

const Profile = () => {
  const { currentUser } = useAuth()

  if (!currentUser) {
    return <Navigate to="/login" />
  }

  // Mock upcoming appointments - in real app, fetch from Firestore
  const upcomingAppointments = [
    {
      id: 1,
      service: 'Classic Haircut',
      date: '2025-10-30',
      time: '2:00 PM',
      barber: 'Mike Johnson'
    },
    {
      id: 2,
      service: 'Beard Trim',
      date: '2025-11-05',
      time: '11:30 AM',
      barber: 'Alex Smith'
    }
  ]

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Your <span className="text-barbershop-gold">Profile</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="bg-barbershop-gray rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Account Info</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400">Email</label>
                <p className="text-white">{currentUser.email}</p>
              </div>
              <div>
                <label className="text-sm text-gray-400">Member Since</label>
                <p className="text-white">
                  {currentUser.metadata.creationTime ? 
                    new Date(currentUser.metadata.creationTime).toLocaleDateString() : 
                    'Unknown'
                  }
                </p>
              </div>
            </div>
            <button className="mt-6 btn-primary w-full">
              Edit Profile
            </button>
          </div>

          {/* Upcoming Appointments */}
          <div className="lg:col-span-2 bg-barbershop-gray rounded-lg p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Upcoming Appointments</h2>
            
            {upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="bg-barbershop-dark rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-semibold text-white">
                          {appointment.service}
                        </h3>
                        <p className="text-gray-300">
                          {new Date(appointment.date).toLocaleDateString()} at {appointment.time}
                        </p>
                        <p className="text-gray-400 text-sm">
                          with {appointment.barber}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-barbershop-gold hover:text-yellow-400 text-sm">
                          Reschedule
                        </button>
                        <button className="text-red-500 hover:text-red-400 text-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 mb-4">No upcoming appointments</p>
                <button className="btn-primary">
                  Book Appointment
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Appointment History */}
        <div className="mt-8 bg-barbershop-gray rounded-lg p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Appointment History</h2>
          <div className="text-center py-8">
            <p className="text-gray-400">No previous appointments found</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile