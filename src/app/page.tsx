import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, BookOpen, Receipt, ClipboardList, Sparkles } from 'lucide-react'

const features = [
  {
    icon: BookOpen,
    title: 'Recipe Management',
    description: 'Component-level cost calculation with automatic cascade updates across your entire menu.',
  },
  {
    icon: Receipt,
    title: 'Invoice OCR',
    description: 'Scan invoices and automatically propagate price changes to every affected recipe.',
  },
  {
    icon: ClipboardList,
    title: 'MEP Planning',
    description: 'Auto-generate mise en place production plans from your events and menu selections.',
  },
  {
    icon: Sparkles,
    title: 'Jules AI',
    description: 'Your personal kitchen intelligence that knows your style, costs, and preferences.',
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
                className="text-stone-300 hover:text-white text-sm font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="bg-brand-500 hover:bg-brand-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md"
              >
                Get Started
              </Link>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="text-center max-w-3xl mx-auto pb-20">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-brand-500/20">
              <Sparkles className="w-4 h-4" />
              Your intelligent kitchen partner
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white font-outfit leading-tight mb-6">
              Cook smarter,{' '}
              <span className="text-brand-400">not harder</span>
            </h1>
            <p className="text-xl text-stone-400 mb-10 leading-relaxed max-w-2xl mx-auto">
              The AI-powered platform that manages your recipes, tracks costs in real-time, 
              and generates production plans — so you can focus on what you do best.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link
                href="/signup"
                className="bg-brand-500 hover:bg-brand-600 text-white px-8 py-3.5 rounded-xl text-base font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                Start for free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white px-8 py-3.5 rounded-xl text-base font-medium transition-all duration-200 border border-stone-700"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-stone-900 font-outfit mb-4">
            Everything your kitchen needs
          </h2>
          <p className="text-lg text-stone-500 max-w-2xl mx-auto">
            Three operational pillars that transform how you run your kitchen.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200 hover:shadow-md hover:border-brand-200 transition-all duration-300 group"
              >
                <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
                  <Icon className="w-6 h-6 text-brand-500" />
                </div>
                <h3 className="text-lg font-semibold text-stone-900 font-outfit mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Social Proof */}
      <section className="bg-stone-900 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <p className="text-2xl text-stone-300 font-outfit leading-relaxed italic mb-6">
            &ldquo;Finally, a tool built for how chefs actually work — not how managers think we work.&rdquo;
          </p>
          <p className="text-brand-400 font-medium">— Built by chefs, for chefs</p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold text-stone-900 font-outfit mb-4">
          Ready to transform your kitchen?
        </h2>
        <p className="text-lg text-stone-500 mb-8">
          Join the community of chefs who cook smarter with AI.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-3.5 rounded-xl text-base font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Get started — it&apos;s free
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 py-8">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="/logo-icon.png"
              alt="My AI Sous Chef"
              width={24}
              height={24}
              className="rounded"
            />
            <span className="text-sm text-stone-500 font-outfit">My AI Sous Chef</span>
          </div>
          <p className="text-sm text-stone-400">
            © 2026 My AI Sous Chef. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
