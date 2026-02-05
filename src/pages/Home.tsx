import { Link } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  defaultWorkingHours,
  normalizeWorkingHours,
  WorkingHours,
} from "../utils/workingHours";
import { GiSmartphone, GiMedal, GiComb } from "react-icons/gi";

const Home = () => {
  const [workingHours, setWorkingHours] =
    useState<WorkingHours>(defaultWorkingHours);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "settings", "workingHours"), (snap) => {
      if (snap.exists()) {
        setWorkingHours(normalizeWorkingHours(snap.data() as WorkingHours));
      } else {
        setWorkingHours(defaultWorkingHours);
      }
    });
    return unsub;
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-barbershop-dark to-barbershop-gray py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Dobrodošao kod{" "}
              <span className="text-barbershop-gold">Briaga</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto">
              Zaboravi na dosadne frizure i klasične priče. Ovde spajamo
              vrhunsko, tradicionalno brijanje i šišanje sa modernim fazonima.
              Mesto gde se stil i majstorstvo sreću – garantovano izlaziš kao
              nov!
            </p>
            <div className="flex flex-col space-y-4 justify-center items-center md:flex-row md:space-x-4 md:space-y-0">
              <Link
                to="/booking"
                className="btn-primary text-lg px-8 py-4 w-full md:w-auto"
              >
                Zakaži termin
              </Link>
              <Link
                to="/services"
                className="btn-secondary text-lg px-8 py-4 w-full md:w-auto"
              >
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
              Ovde si došao pravo kod majstora. Ja sam vlasnik i jedini
              berberin, što znači da dobijaš 100% moje posvećenosti i pažnje.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-barbershop-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <GiMedal className="w-8 h-8 text-barbershop-dark" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Iskusan Berberin
              </h3>
              <p className="text-gray-300">
                Sa godinama iskustva u klasičnim i modernim rezovima, garantujem
                da ćeš dobiti frizuru tačno kakvu želiš. Tvoj stil je u sigurnim
                rukama!{" "}
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-barbershop-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <GiComb className="w-8 h-8 text-barbershop-dark" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Premium Proizvodi
              </h3>
              <p className="text-gray-300">
                Koristim samo najbolje alate i kozmetiku, da bi tvoj izgled bio
                savršen i da bi ti frizura duže trajala.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-barbershop-gold rounded-full flex items-center justify-center mx-auto mb-4">
                <GiSmartphone className="w-8 h-8 text-barbershop-dark" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">
                Lako Zakazivanje
              </h3>
              <p className="text-gray-300">
                Ne gubi vreme! Zakaži svoj termin online, kad god i gde god ti
                odgovara, uz naš super jednostavan sistem.
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

      {/* Working Hours */}
      <section className="py-16 bg-barbershop-gray">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-bold text-white mb-3">Radno vreme</h2>
            <p className="text-gray-300 text-lg">
              Dođi u terminu koji ti najviše odgovara.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { key: "1", label: "Ponedeljak" },
              { key: "2", label: "Utorak" },
              { key: "3", label: "Sreda" },
              { key: "4", label: "Četvrtak" },
              { key: "5", label: "Petak" },
              { key: "6", label: "Subota" },
              { key: "0", label: "Nedelja" },
            ].map((day) => {
              const config = workingHours.days[day.key];
              const hoursLabel = config?.isOpen
                ? `${config.open} – ${config.close}`
                : "Zatvoreno";
              return (
                <div
                  key={day.key}
                  className="flex items-center justify-between rounded-md bg-barbershop-dark/60 px-4 py-3 text-gray-200"
                >
                  <span className="font-semibold text-white">{day.label}</span>
                  <span className="text-gray-300">{hoursLabel}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
