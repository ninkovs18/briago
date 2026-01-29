import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { collection, getDocs } from "firebase/firestore"
import { db } from "../firebase"

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

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center text-white text-2xl">
        Loading...
      </div>
    )
  }

  return (
    <div className="min-h-screen py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
            Our <span className="text-barbershop-gold">Services</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Professional grooming services tailored to your style and preferences
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
                  {service.price}RSD
                </span>
              </div>

              <p className="text-gray-300 mb-4">{service.description}</p>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-400">
                  Duration: {service.duration}
                </span>
                <Link to="/booking" className="btn-primary">
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-barbershop-gray rounded-lg p-8"> <h2 className="text-3xl font-bold text-white mb-6 text-center"> Opening Hours </h2> <div className="grid grid-cols-1 md:grid-cols-2 gap-8"> <div> <h3 className="text-xl font-semibold text-barbershop-gold mb-4">Weekdays</h3> <div className="space-y-2 text-gray-300"> <div className="flex justify-between"> <span>Monday - Friday</span> <span>9:00 AM - 7:00 PM</span> </div> </div> </div> <div> <h3 className="text-xl font-semibold text-barbershop-gold mb-4">Weekend</h3> <div className="space-y-2 text-gray-300"> <div className="flex justify-between"> <span>Saturday</span> <span>9:00 AM - 6:00 PM</span> </div> <div className="flex justify-between"> <span>Sunday</span> <span>10:00 AM - 4:00 PM</span> </div> </div> </div> </div> </div> </div> </div>

  )
}

export default Services
