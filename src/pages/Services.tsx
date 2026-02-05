import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { collection, doc, getDocs, onSnapshot } from "firebase/firestore"
import { db } from "../firebase"
import { defaultWorkingHours, normalizeWorkingHours, WorkingHours } from "../utils/workingHours"

// Firestore model
export interface Service {
  id: string
  name: string
  price: number
  duration: number
  description: string
}

const Services = () => {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [workingHours, setWorkingHours] = useState<WorkingHours>(defaultWorkingHours)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "services"))

        const list: Service[] = querySnapshot.docs.map(doc => {
          const data = doc.data()

          return {
            id: doc.id,
            name: data.name as string,
            price: data.price as number,
            duration: data.duration as number,
            description: data.description as string
          }
        })

        setServices(list)
      } catch (error) {
        console.error("Error fetching services:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchServices()
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

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-white text-2xl">
        Učitavanje...
      </div>
    )
  }

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Naše <span className="text-barbershop-gold">usluge</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Profesionalne usluge negovanja prilagođene tvom stilu i željama
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map(service => (
            <div
              key={service.id}
              className="bg-barbershop-gray rounded-lg p-6 hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white">
                  {service.name}
                </h3>
                <span className="text-2xl font-bold text-barbershop-gold">
                  {service.price} RSD
                </span>
              </div>

              <p className="text-gray-300 mb-4">{service.description}</p>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  Trajanje: {service.duration} min
                </span>
                <Link to="/booking" className="btn-primary">
                  Zakaži termin
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-barbershop-gray rounded-lg p-8">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">
            Radno vreme
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: '1', label: 'Ponedeljak' },
              { key: '2', label: 'Utorak' },
              { key: '3', label: 'Sreda' },
              { key: '4', label: 'Četvrtak' },
              { key: '5', label: 'Petak' },
              { key: '6', label: 'Subota' },
              { key: '0', label: 'Nedelja' }
            ].map((day) => {
              const config = workingHours.days[day.key]
              const hoursLabel = config?.isOpen ? `${config.open} – ${config.close}` : 'Zatvoreno'
              return (
                <div key={day.key} className="flex items-center justify-between rounded-md bg-barbershop-dark/60 px-4 py-3 text-gray-200">
                  <span className="font-semibold text-white">{day.label}</span>
                  <span className="text-gray-300">{hoursLabel}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>

  )
}

export default Services
