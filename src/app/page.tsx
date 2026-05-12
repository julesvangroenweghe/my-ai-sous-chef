import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, ChevronRight } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: '#FDF8F2', color: '#2C1810' }}>

      {/* NAV */}
      <nav style={{ background: '#F2E8D5', borderBottom: '1px solid #E8D5B5' }} className="sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo-full-light.png" alt="My AI Sous Chef" width={160} height={40} style={{ objectFit: 'contain' }} />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium" style={{ color: '#9E7E60' }}>
            <a href="#uitdagingen" className="hover:text-amber-700 transition-colors">Uitdagingen</a>
            <a href="#oplossing" className="hover:text-amber-700 transition-colors">Oplossing</a>
            <a href="#features" className="hover:text-amber-700 transition-colors">Features</a>
            <a href="#klanten" className="hover:text-amber-700 transition-colors">Klanten</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors" style={{ color: '#9E7E60' }}>
              Inloggen
            </Link>
            <Link href="/signup" className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md" style={{ background: '#E8A040', color: '#2C1810' }}>
              Demo aanvragen
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="relative overflow-hidden" style={{ background: '#F2E8D5' }}>
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-4xl">
            <p className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: '#C4703A' }}>
              AI-platform voor eventchefs
            </p>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-8" style={{ color: '#2C1810', fontFamily: 'Georgia, serif' }}>
              De chef die meedenkt.<br />
              <span style={{ color: '#C4703A' }}>De operatie die<br />niet meer faalt.</span>
            </h1>
            <p className="text-xl md:text-2xl leading-relaxed mb-10 max-w-2xl" style={{ color: '#9E7E60' }}>
              My AI Sous Chef is het culinaire platform voor eventcateraars: AI-menu's die jouw stijl ademen, food cost die klopt, en een operatie die schaalt zonder chaos.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-base transition-all shadow-lg hover:shadow-xl" style={{ background: '#E8A040', color: '#2C1810' }}>
                Gratis starten <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-medium text-base transition-all border" style={{ background: 'white', color: '#2C1810', borderColor: '#E8D5B5' }}>
                Inloggen <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <p className="mt-6 text-sm" style={{ color: '#9E7E60' }}>
              In 5 minuten actief. Geen creditcard vereist.
            </p>
          </div>
        </div>
        {/* Decoratieve achtergrond */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden lg:block" style={{
          background: 'linear-gradient(135deg, #E8D5B5 0%, #C4703A22 100%)',
          clipPath: 'polygon(20% 0%, 100% 0%, 100% 100%, 0% 100%)'
        }} />
      </header>

      {/* UITDAGINGEN */}
      <section id="uitdagingen" className="py-24" style={{ background: '#FDF8F2' }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#C4703A' }}>
            Uitdagingen
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-16" style={{ color: '#2C1810', fontFamily: 'Georgia, serif' }}>
            Waar het in de keuken<br />vaak misgaat
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Dubbel werk',
                body: 'Menus en MEP telkens opnieuw aanpassen bij wijzigingen in aantal personen of gerechten.'
              },
              {
                title: 'Food cost op gevoel',
                body: 'Inkoop zonder real-time leveranciersprijzen. Marges die je pas achteraf kent.'
              },
              {
                title: 'Verloren recepten',
                body: 'Keukens die draaien op persoonlijke kennis. Verdwijnt een chef, verdwijnt de kennis.'
              },
              {
                title: 'Menu zonder identiteit',
                body: 'Snel een menu samenstellen dat niet jouw stijl ademt en de klant niet raakt.'
              }
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl border" style={{ background: 'white', borderColor: '#E8D5B5' }}>
                <div className="w-10 h-10 rounded-xl mb-4 flex items-center justify-center" style={{ background: '#FEF3E2' }}>
                  <div className="w-3 h-3 rounded-full" style={{ background: '#E8A040' }} />
                </div>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#2C1810' }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9E7E60' }}>{item.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 p-6 rounded-2xl" style={{ background: '#F2E8D5', borderLeft: '4px solid #C4703A' }}>
            <p className="text-lg font-medium" style={{ color: '#2C1810' }}>
              Naarmate je meer events draait, worden dit geen incidenten meer — maar structureel verlies.
            </p>
          </div>
        </div>
      </section>

      {/* ROOT CAUSE — MOODY SECTIE */}
      <section className="py-24" style={{ background: '#2C1810' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-6" style={{ color: '#E8A040' }}>
                Het onderliggende probleem
              </p>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight" style={{ color: '#FDF8F2', fontFamily: 'Georgia, serif' }}>
                Wat misgaat op het event,<br />begint weken eerder
              </h2>
              <p className="text-lg leading-relaxed mb-6" style={{ color: '#9E7E60' }}>
                In de keuken stapelen kleine beslissingen zich op. Een menu dat niet uitgerekend is. Een bestelling op basis van geheugen. Een MEP die in een notitie staat, niet in een systeem.
              </p>
              <p className="text-lg leading-relaxed" style={{ color: '#9E7E60' }}>
                Als er dan iets verandert — 20 gasten meer, een allergie, een laatste-minuut wijziging — blijft alleen improvisatie over.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Tijdsbesparing', value: '4u+', sub: 'minder per event op MEP en inkoop' },
                { label: 'Food cost precisie', value: '±2%', sub: 'marge-afwijking versus target' },
                { label: 'Kennisbank recepten', value: '9.000+', sub: 'professionele klassieke recepten' },
                { label: 'Leveranciersproducten', value: '6.000+', sub: 'real-time prijzen per kg in de app' },
              ].map((stat) => (
                <div key={stat.label} className="p-6 rounded-2xl" style={{ background: '#3D2518', border: '1px solid #5C3D2A' }}>
                  <div className="text-3xl font-bold mb-1" style={{ color: '#E8A040' }}>{stat.value}</div>
                  <div className="text-xs font-semibold mb-1" style={{ color: '#C4703A' }}>{stat.label}</div>
                  <div className="text-xs" style={{ color: '#9E7E60' }}>{stat.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* OPLOSSING */}
      <section id="oplossing" className="py-24" style={{ background: '#FDF8F2' }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#C4703A' }}>
            De oplossing
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#2C1810', fontFamily: 'Georgia, serif' }}>
            Met My AI Sous Chef<br />één keer goed vastleggen.<br />
            <span style={{ color: '#C4703A' }}>Daarna nooit meer gokken.</span>
          </h2>
          <p className="text-xl mb-12 max-w-3xl" style={{ color: '#9E7E60' }}>
            My AI Sous Chef combineert culinaire AI met operationele precisie. Van seizoensinspiratie tot paklijst. Alles hangt aan één event — en als iets wijzigt, werkt het overal door.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              { title: 'Één event = één bron van waarheid', body: 'Menu, food cost, MEP, inkoop en paklijst hangen aan één centraal event.' },
              { title: 'Wijzigingen werken overal door', body: '20 gasten meer? MEP-hoeveelheden, food cost en bestellijst updaten automatisch.' },
              { title: 'AI die jouw stijl kent', body: 'Jules AI leert van je keuzes. Elk menu ademt jouw culinaire identiteit.' },
            ].map((item) => (
              <div key={item.title} className="p-6 rounded-2xl border flex gap-4" style={{ background: 'white', borderColor: '#E8D5B5' }}>
                <div className="w-6 h-6 rounded-full flex-shrink-0 mt-1 flex items-center justify-center" style={{ background: '#E8A040' }}>
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
                <div>
                  <h3 className="font-bold mb-2" style={{ color: '#2C1810' }}>{item.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: '#9E7E60' }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Feature callouts */}
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: 'AI Menu in minuten', body: 'Importeer de klantbrief — de AI leest context, budget en wensen, en genereert een volledig menu vanuit jouw receptenlibrary, jouw LEGENDE-gerechten en jouw culinaire handtekening. Nooit generiek, altijd herkenbaar van jou.' },
              { title: 'MEP & Inkoop op autopiloot', body: 'Van bevestigd event naar MEP-lijst en bestelorder in één klik. Hoeveelheden zijn exacte berekeningen, niet schattingen.' },
              { title: 'Factuur in één klik', body: 'Van event naar PDF-factuur met klantgegevens, BTW en betaaldeadline. Geen los Word-document meer.' },
              { title: 'Inpakken met zekerheid', body: 'Auto-gegenereerde paklijsten per event-type. Klein dingen missen nooit meer.' },
            ].map((item) => (
              <div key={item.title} className="p-8 rounded-2xl border" style={{ background: '#F2E8D5', borderColor: '#E8D5B5' }}>
                <h3 className="font-bold text-lg mb-3" style={{ color: '#2C1810' }}>{item.title}</h3>
                <p className="leading-relaxed" style={{ color: '#9E7E60' }}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EVENT LIFECYCLE */}
      <section className="py-24" style={{ background: '#F2E8D5' }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#C4703A' }}>
            De cyclus
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#2C1810', fontFamily: 'Georgia, serif' }}>
            Goeie voorbereiding is al<br />half gewonnen
          </h2>
          <p className="text-lg mb-16 max-w-2xl mx-auto" style={{ color: '#9E7E60' }}>
            Op het event sta je in de keuken — niet achter een scherm. My AI Sous Chef doet het zware werk ruim op voorhand, zodat je op de dag zelf gewoon kunt koken.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                fase: 'Weken op voorhand',
                kleur: '#E8A040',
                items: [
                  'Menu bouwen vanuit klantbrief — in jouw stijl, met jouw recepten',
                  'Food cost per persoon berekenen en bewaken',
                  'Voorstel PDF opmaken en versturen naar klant',
                  'Versies bijhouden tot bevestiging',
                ]
              },
              {
                fase: 'Dagen voor vertrek',
                kleur: '#C4703A',
                items: [
                  'MEP-fiches automatisch klaarzetten per gerecht',
                  'Inkooplijst per leverancier genereren',
                  'Paklijst afdrukken — keukenmateriaal + logistiek',
                  'Allergenen nalopen per gast',
                ]
              },
              {
                fase: 'Na afloop',
                kleur: '#9E7E60',
                items: [
                  'Factuur genereren in één klik',
                  'Werkelijke food cost vergelijken met target',
                  'Topgerechten opslaan in je LEGENDE-bibliotheek',
                  'Geef feedback op gerechten — de AI leert mee',
                ]
              }
            ].map((fase) => (
              <div key={fase.fase} className="p-8 rounded-2xl" style={{ background: 'white', border: '1px solid #E8D5B5' }}>
                <div className="w-12 h-1 rounded-full mb-6" style={{ background: fase.kleur }} />
                <h3 className="font-bold text-xl mb-6" style={{ color: '#2C1810' }}>{fase.fase}</h3>
                <ul className="space-y-3">
                  {fase.items.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm" style={{ color: '#9E7E60' }}>
                      <div className="w-4 h-4 rounded-full flex-shrink-0 mt-0.5 flex items-center justify-center" style={{ background: fase.kleur + '22', border: `1px solid ${fase.kleur}` }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: fase.kleur }} />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Leerloop banner */}
          <div className="mt-12 p-8 rounded-2xl flex items-center gap-6" style={{ background: '#2C1810' }}>
            <div className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#E8A040' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-base" style={{ color: '#F2E8D5' }}>
                De app groeit mee met jouw feedback.
              </p>
              <p className="text-sm mt-1" style={{ color: '#9E7E60' }}>
                Elk event dat je afwerkt, elke swap die je maakt, elk gerecht dat je beoordeelt — de AI leert jouw smaak steeds beter kennen. Na een jaar werkt het systeem harder voor jou dan je sous-chef.
              </p>
            </div>
          </div>

        </div>
      </section>

      {/* KERNFEATURES */}
      <section id="features" className="py-24" style={{ background: '#FDF8F2' }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#C4703A' }}>
            Kernfuncties
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#2C1810', fontFamily: 'Georgia, serif' }}>
            Het systeem dat onthoudt<br />hoe jij kookt.
          </h2>
          <p className="text-xl mb-16 max-w-2xl" style={{ color: '#9E7E60' }}>
            Culinaire intelligentie gecombineerd met operationele precisie. Alles in één platform.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'AI Menu Generator', body: 'De AI leest de klantbrief en past aan op jouw stijl, jouw gekende recepten en jouw LEGENDE-gerechten. Geen generieke output — elk menu is herkenbaar van jou.' },
              { title: 'Chef DNA & Culinaire Identiteit', body: 'Een lerend profiel dat jouw signatuuringrediënten, technieken en referentiechefs vastlegt. Elk menu ademt jouw identiteit.' },
              { title: 'Auto MEP & Inkoop', body: 'Van event naar keukenlijsten en bestellijsten. Hoeveelheden berekend op basis van menu, aantal personen en diëten.' },
              { title: 'Ripple Effect', body: 'Één wijziging werkt automatisch door naar MEP, food cost, inkoop en paklijst. Nooit meer dubbel werk.' },
              { title: 'Paklijst & Draaiboek', body: 'Auto-gegenereerde paklijsten per event-type. Tijdlijn-gebaseerd draaiboek voor je team op locatie.' },
              { title: 'Facturatie', body: 'Van bevestigd event naar PDF-factuur met BTW, klantgegevens en betaaldeadline. In één klik.' },
              { title: 'Food Cost Intelligence', body: 'Real-time food cost op basis van 6.000+ leveranciersproducten. Marge per gerecht, per gang, per persoon.' },
              { title: 'OCR Scanning', body: 'Scan facturen, prijslijsten, recepten en MEP-lijsten. AI verwerkt en slaat alles automatisch op.' },
              { title: '9.000+ Klassieke Recepten', body: 'Professionele kennisbank als referentie en inspiratie. Combineer met jouw LEGENDE-gerechten.' },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl border hover:shadow-md transition-shadow" style={{ background: 'white', borderColor: '#E8D5B5' }}>
                <h3 className="font-bold text-base mb-2" style={{ color: '#2C1810' }}>{feature.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#9E7E60' }}>{feature.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl" style={{ background: '#E8A040', color: '#2C1810' }}>
              Alle features ontdekken <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CASE STUDY — SIR CATERING */}
      <section id="klanten" className="py-24" style={{ background: '#2C1810' }}>
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#E8A040' }}>
            In de praktijk
          </p>
          <h2 className="text-4xl md:text-5xl font-bold mb-16" style={{ color: '#FDF8F2', fontFamily: 'Georgia, serif' }}>
            Gebouwd door een chef.<br />Getest op echte events.
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold tracking-wider uppercase mb-6" style={{ background: '#3D2518', color: '#E8A040', border: '1px solid #5C3D2A' }}>
                SIR Catering — Gent
              </div>
              <blockquote className="text-2xl leading-relaxed mb-8" style={{ color: '#E8D5B5', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
                "Ik bouwde dit systeem omdat het niet bestond. Een tool die meedenkt als sous chef — niet alleen over de logistiek, maar over het gerecht zelf."
              </blockquote>
              <div className="mb-8">
                <div className="font-bold" style={{ color: '#E8A040' }}>Jules Van Groenweghe</div>
                <div className="text-sm" style={{ color: '#9E7E60' }}>Chef-eigenaar, SIR Catering — Gent</div>
              </div>
              <p className="leading-relaxed" style={{ color: '#9E7E60' }}>
                SIR Catering is een Gents eventcateringbedrijf met focus op gastronomische beleving. Van cocktaildînatoires voor 30 personen tot walking dinners voor 300. My AI Sous Chef werd ontwikkeld vanuit de dagelijkse operationele noden van dit bedrijf.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'MEP in minuten', label: 'Vroeger 2–3 uur handmatig. Nu gegenereerd vanuit het event.' },
                { value: 'Altijd op maat', label: 'Elk menu ademt het DNA van de chef en de brief van de klant.' },
                { value: 'Food cost klopt', label: 'Marges zichtbaar per gerecht, per gang, per persoon.' },
                { value: 'Schaalbaar', label: 'Van 1 event naar meerdere events tegelijk — zonder extra chaos.' },
              ].map((item) => (
                <div key={item.value} className="p-6 rounded-2xl" style={{ background: '#3D2518', border: '1px solid #5C3D2A' }}>
                  <div className="font-bold text-sm mb-2" style={{ color: '#E8A040' }}>{item.value}</div>
                  <div className="text-xs leading-relaxed" style={{ color: '#9E7E60' }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MATCH SECTIE */}
      <section className="py-24" style={{ background: '#F2E8D5' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-xs font-bold tracking-widest uppercase mb-4" style={{ color: '#C4703A' }}>
                Match
              </p>
              <h2 className="text-4xl md:text-5xl font-bold mb-8" style={{ color: '#2C1810', fontFamily: 'Georgia, serif' }}>
                Wanneer My AI Sous Chef<br />goed past
              </h2>
              <ul className="space-y-4">
                {[
                  'Eventcateraars met 2–10 vaste krachten + flex',
                  'Chefs die hun culinaire identiteit willen laten groeien',
                  'Keukens met meerdere events tegelijkertijd',
                  'Teams die willen groeien zonder extra chaos',
                  'Chefs die AI willen inzetten zonder hun stijl te verliezen',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-base" style={{ color: '#2C1810' }}>
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center" style={{ background: '#E8A040' }}>
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4L3.5 6.5L9 1" stroke="#2C1810" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-10 rounded-2xl text-center" style={{ background: '#2C1810' }}>
              <h3 className="text-2xl font-bold mb-4" style={{ color: '#E8A040', fontFamily: 'Georgia, serif' }}>
                Klaar om te starten?
              </h3>
              <p className="mb-8" style={{ color: '#9E7E60' }}>
                In 5 minuten actief. We begeleiden je door de setup.
              </p>
              <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl w-full justify-center" style={{ background: '#E8A040', color: '#2C1810' }}>
                Gratis starten <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="mt-4 text-xs" style={{ color: '#5C4730' }}>Of plan een demo van 30 minuten</p>
              <Link href="/signup" className="mt-2 inline-block text-sm font-medium underline" style={{ color: '#E8A040' }}>
                Demo aanvragen →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: '#2C1810', borderTop: '1px solid #3D2518' }}>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div>
              <Image src="/logo-full-light.png" alt="My AI Sous Chef" width={140} height={35} style={{ objectFit: 'contain', filter: 'brightness(0) invert(1) sepia(1) saturate(2) hue-rotate(5deg)' }} />
              <p className="mt-3 text-sm max-w-xs" style={{ color: '#9E7E60' }}>
                Culinaire AI + Operationele Precisie voor de serieuze eventchef.
              </p>
            </div>
            <div className="flex flex-wrap gap-8 text-sm" style={{ color: '#9E7E60' }}>
              <div>
                <div className="font-semibold mb-3" style={{ color: '#E8D5B5' }}>Platform</div>
                <div className="space-y-2">
                  <div><a href="#features" className="hover:text-amber-400 transition-colors">Features</a></div>
                  <div><Link href="/login" className="hover:text-amber-400 transition-colors">Inloggen</Link></div>
                  <div><Link href="/signup" className="hover:text-amber-400 transition-colors">Aanmelden</Link></div>
                </div>
              </div>
              <div>
                <div className="font-semibold mb-3" style={{ color: '#E8D5B5' }}>Contact</div>
                <div className="space-y-2">
                  <div><a href="mailto:jules@sircatering.be" className="hover:text-amber-400 transition-colors">jules@sircatering.be</a></div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t flex flex-col md:flex-row items-center justify-between gap-4 text-xs" style={{ borderColor: '#3D2518', color: '#5C4730' }}>
            <p>&copy; 2026 My AI Sous Chef. Alle rechten voorbehouden.</p>
            <p>Gebouwd voor chefs, door een chef.</p>
          </div>
        </div>
      </footer>

    </div>
  )
}
