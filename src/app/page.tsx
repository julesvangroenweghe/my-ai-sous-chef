import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, Receipt, ClipboardList, Sparkles } from 'lucide-react'

const features = [
 {
  icon: BookOpen,
  title: 'Receptenbeheer',
  description: 'Kostenberekening op componentniveau met automatische cascade-updates over je hele menu.',
 },
 {
  icon: Receipt,
  title: 'Factuur OCR',
  description: 'Scan facturen en propageer prijswijzigingen automatisch naar elk getroffen recept.',
 },
 {
  icon: ClipboardList,
  title: 'MEP Planning',
  description: 'Genereer automatisch mise en place productieplannen vanuit je events en menuselecties.',
 },
 {
  icon: Sparkles,
  title: 'Jules AI',
  description: 'Jouw persoonlijke keukenintelligentie die je stijl, kosten en voorkeuren kent.',
 },
]

export default function LandingPage() {
 return (
  <div className="min-h-screen bg-stone-50">
   {/* Hero */}
   <header className="relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900" />
    <div className="relative max-w-6xl mx-auto px-6 py-8">
     {/* Nav */}
     <nav className="flex items-center justify-between mb-20">
      <div className="flex items-center gap-3">
       <Image
        src="/logo-icon.png"
        alt="My AI Sous Chef"
        width={40}
        height={40}
        className="rounded-lg"
       />
       <span className="text-white font-outfit font-semibold text-lg">
        My AI Sous Chef
       </span>
      </div>
      <div className="flex items-center gap-4">
       <Link
        href="/login"
        className="text-[#5C4730] hover:text-white text-sm font-medium transition-colors"
       >
        Inloggen
       </Link>
       <Link
        href="/signup"
        className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
       >
        Aan de slag
       </Link>
      </div>
     </nav>

     {/* Hero Content */}
     <div className="text-center max-w-3xl mx-auto pb-20">
      <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-brand-500/20">
       <Sparkles className="w-4 h-4" />
       Jouw intelligente keukenpartner
      </div>
      <h1 className="text-5xl md:text-6xl font-bold text-white font-outfit leading-tight mb-6">
       Kook slimmer,{' '}
       <span className="text-brand-400">niet harder</span>
      </h1>
      <p className="text-xl text-[#9E7E60] mb-10 leading-relaxed max-w-2xl mx-auto">
       Het AI-platform dat je recepten beheert, kosten real-time bijhoudt 
       en productieplannen genereert — zodat jij je kunt focussen op wat je het beste doet.
      </p>
      <div className="flex items-center justify-center gap-4">
       <Link
        href="/signup"
        className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3.5 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
       >
        Gratis starten <ArrowRight className="w-4 h-4" />
       </Link>
       <Link
        href="/login"
        className="bg-white/10 hover:bg-white/15 text-white px-8 py-3.5 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border border-white/10"
       >
        Inloggen
       </Link>
      </div>
     </div>
    </div>
   </header>

   {/* Features */}
   <section className="max-w-6xl mx-auto px-6 py-24">
    <h2 className="text-3xl font-bold text-stone-900 font-outfit text-center mb-4">
     Alles wat je keuken nodig heeft
    </h2>
    <p className="text-[#5C4730] text-center mb-16 max-w-2xl mx-auto">
     Van receptenbeheer tot kostenbewaking, van factuurscanning tot productieplannen.
    </p>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
     {features.map((feature) => (
      <div
       key={feature.title}
       className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 hover:shadow-md transition-shadow"
      >
       <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4">
        <feature.icon className="w-6 h-6 text-brand-600" />
       </div>
       <h3 className="font-semibold text-stone-900 mb-2">{feature.title}</h3>
       <p className="text-sm text-[#5C4730] leading-relaxed">{feature.description}</p>
      </div>
     ))}
    </div>
   </section>

   {/* CTA */}
   <section className="bg-white py-20">
    <div className="max-w-4xl mx-auto px-6 text-center">
     <h2 className="text-3xl font-bold text-white font-outfit mb-4">
      Klaar om je keuken te transformeren?
     </h2>
     <p className="text-[#9E7E60] mb-8 text-lg">
      Sluit je aan bij chefs die hun kosten beheersen en slimmer werken.
     </p>
     <Link
      href="/signup"
      className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3.5 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
     >
      Begin vandaag <ArrowRight className="w-4 h-4" />
     </Link>
    </div>
   </section>

   {/* Footer */}
   <footer className="bg-stone-50 border-t border-stone-200 py-8">
    <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
     <div className="flex items-center gap-2">
      <Image src="/logo-icon.png" alt="My AI Sous Chef" width={24} height={24} className="rounded" />
      <span className="text-sm text-[#5C4730]">My AI Sous Chef</span>
     </div>
     <p className="text-sm text-[#9E7E60]">&copy; 2026 My AI Sous Chef. Alle rechten voorbehouden.</p>
    </div>
   </footer>
  </div>
 )
}
