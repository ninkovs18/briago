import { Link } from 'react-router-dom'

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-barbershop-dark to-barbershop-gray py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Dobrodošao kod <span className="text-barbershop-gold">Briaga</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Zaboravi na dosadne frizure i klasične priče. Ovde spajamo vrhunsko, tradicionalno brijanje i šišanje sa modernim fazonima. Mesto gde se stil i majstorstvo sreću – garantovano izlaziš kao nov!
            </p>
            <div className="flex flex-col space-y-4 justify-center items-center md:flex-row md:space-x-4 md:space-y-0">
              <Link to="/booking" className="btn-primary text-lg px-8 py-4 w-full md:w-auto">
                Zakaži termin
              </Link>
              <Link to="/services" className="btn-secondary text-lg px-8 py-4 w-full md:w-auto">
                Cenovnik
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-barbershop-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              Zašto da izabereš Briago?
            </h2>
            <p className="text-gray-300 text-lg">
              Ovde si došao pravo kod majstora. Ja sam vlasnik i jedini berberin, što znači da dobijaš 100% moje posvećenosti i pažnje.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-barbershop-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-barbershop-dark" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">🏆 Iskusan Berberin</h3>
              <p className="text-gray-300">
                Sa godinama iskustva u klasičnim i modernim rezovima, garantujem da ćeš dobiti frizuru tačno kakvu želiš. Tvoj stil je u sigurnim rukama!              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-barbershop-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-barbershop-dark" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">✨ Premium Proizvodi</h3>
              <p className="text-gray-300">
                Koristim samo najbolje alate i kozmetiku, da bi tvoj izgled bio savršen i da bi ti frizura duže trajala.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-barbershop-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-barbershop-dark" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Lako Zakazivanje</h3>
              <p className="text-gray-300">
                Ne gubi vreme! Zakaži svoj termin online, kad god i gde god ti odgovara, uz naš super jednostavan sistem.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-barbershop-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Spreman za osveženje?
          </h2>
          <p className="text-gray-300 text-lg mb-8">
            Zakaži svoj termin već danas i oseti Briago razliku!
          </p>
          <Link to="/booking" className="btn-primary text-lg px-8 py-4">
            👉 Zakaži Svoj Termin
          </Link>
        </div>
      </section>
    </div>
  )
}

export default Home