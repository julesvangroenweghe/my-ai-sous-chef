import Link from 'next/link'
import { ChefHat, ArrowRight, BookOpen, CalendarDays, Sparkles, ScanLine, TrendingUp, Shield } from 'lucide-react'

export default function LandingPage() {
  return (
    <main className="min-h-[100dvh] bg-surface-muted">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-muted/80 backdrop-blur-xl border-b border-stone-200/40">
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-lg text-stone-900">My AI Sous Chef</span>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              href="/login" 
              className="btn-ghost text-sm"
            >
              Sign in
            </Link>
            <Link 
              href="/signup" 
              className="btn-primary text-sm py-2.5 px-5"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — Asymmetric Split Layout */}
      <section className="pt-32 pb-20 px-6 md:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Content */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-brand-50 border border-brand-200/50 rounded-full">
              <Sparkles className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-medium text-brand-700">AI-powered kitchen management</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-stone-900 tracking-tight leading-[1.1]">
              Your intelligent
              <br />
              <span className="text-brand-600">kitchen partner</span>
            </h1>
            
            <p className="text-lg text-stone-500 leading-relaxed max-w-[50ch]">
              Manage recipes, plan events, track food costs, and generate production plans — all with an AI that learns your cooking style.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/signup" className="btn-primary text-base py-3.5 px-8">
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="/login" className="btn-secondary text-base py-3.5 px-8">
                Sign in
              </Link>
            </div>

            <div className="flex items-center gap-6 pt-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-stone-400" />
                <span className="text-sm text-stone-400">Free for individual chefs</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-stone-400" />
                <span className="text-sm text-stone-400">Used by 200+ kitchens</span>
              </div>
            </div>
          </div>

          {/* Right: Feature Preview Cards — Bento Style */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card-hover p-6 col-span-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-brand-600" />
                </div>
                <h3 className="font-display font-semibold text-stone-900">Recipe Management</h3>
              </div>
              <p className="text-sm text-stone-500 leading-relaxed">
                Component-level recipes with automatic cost calculation. Change an ingredient price once — it cascades everywhere.
              </p>
            </div>

            <div className="card-hover p-6">
              <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center mb-3">
                <CalendarDays className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-display font-semibold text-stone-900 mb-2">MEP Planning</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Auto-generated mise en place from your menu and guest count.
              </p>
            </div>

            <div className="card-hover p-6">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mb-3">
                <ScanLine className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-display font-semibold text-stone-900 mb-2">Invoice OCR</h3>
              <p className="text-sm text-stone-500 leading-relaxed">
                Scan supplier invoices. Prices update across all your recipes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition — Asymmetric 2-col */}
      <section className="py-20 px-6 md:px-8 bg-white border-y border-stone-200/40">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-4">
              Built for the chef, not the spreadsheet
            </h2>
            <p className="text-lg text-stone-500 leading-relaxed">
              Unlike traditional kitchen software, My AI Sous Chef adapts to how you actually work. 
              It remembers your techniques, learns your preferences, and gets smarter with every recipe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
            <div className="md:col-span-3 card p-8 space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-50 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-brand-600" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-lg text-stone-900">Jules AI</h3>
                  <p className="text-sm text-stone-500">Your personal culinary intelligence</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-2 shrink-0" />
                  <p className="text-sm text-stone-600">Learns your cooking style, signature techniques, and ingredient preferences</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-2 shrink-0" />
                  <p className="text-sm text-stone-600">Proactive alerts: price changes, seasonal alternatives, cost optimizations</p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-stone-50 rounded-xl">
                  <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-2 shrink-0" />
                  <p className="text-sm text-stone-600">Suggests recipe variations based on your kitchen style and market prices</p>
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              <div className="card p-6">
                <div className="font-mono text-3xl font-bold text-brand-600 mb-1">32%</div>
                <p className="text-sm text-stone-500">Average food cost reduction</p>
              </div>
              <div className="card p-6">
                <div className="font-mono text-3xl font-bold text-stone-900 mb-1">4h</div>
                <p className="text-sm text-stone-500">Saved per week on MEP planning</p>
              </div>
              <div className="card p-6">
                <div className="font-mono text-3xl font-bold text-emerald-600 mb-1">100%</div>
                <p className="text-sm text-stone-500">Recipe cost visibility</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing — Dual Layer */}
      <section className="py-20 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold text-stone-900 tracking-tight mb-4">
              Pricing that grows with your kitchen
            </h2>
            <p className="text-lg text-stone-500 leading-relaxed">
              Start free. Scale when your kitchen does.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            {/* Chef Profile */}
            <div className="md:col-span-2 card p-8 space-y-6">
              <div>
                <div className="text-sm font-medium text-stone-500 uppercase tracking-wider mb-2">Chef Profile</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-stone-900">Free</span>
                </div>
                <p className="text-sm text-stone-500 mt-2">For individual chefs building their craft</p>
              </div>
              <div className="space-y-3 pt-4 border-t border-stone-100">
                {['Personal AI memory', 'Style & technique profiling', 'Recipe inspiration', 'Portable chef profile'].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-stone-100 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-stone-600">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className="btn-secondary w-full justify-center">
                Create Profile
              </Link>
            </div>

            {/* Kitchen Plan */}
            <div className="md:col-span-3 card p-8 space-y-6 border-brand-200 ring-1 ring-brand-100 relative overflow-hidden">
              <div className="absolute top-4 right-4 px-3 py-1 bg-brand-600 text-white text-xs font-medium rounded-full">
                Popular
              </div>
              <div>
                <div className="text-sm font-medium text-brand-600 uppercase tracking-wider mb-2">Kitchen Plan</div>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-4xl font-bold text-stone-900">&euro;49</span>
                  <span className="text-stone-500">/month</span>
                </div>
                <p className="text-sm text-stone-500 mt-2">For professional kitchens and catering businesses</p>
              </div>
              <div className="space-y-3 pt-4 border-t border-stone-100">
                {['Everything in Chef Profile', 'Full recipe management with costing', 'OCR invoice scanning', 'MEP auto-generation', 'Food cost dashboards', 'Supplier price tracking'].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-brand-50 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-sm text-stone-600">{feature}</span>
                  </div>
                ))}
              </div>
              <Link href="/signup" className="btn-primary w-full justify-center">
                Start Free Trial
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 md:px-8 border-t border-stone-200/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-semibold text-stone-900">My AI Sous Chef</span>
          </div>
          <p className="text-sm text-stone-400 font-display italic">
            Sold to the restaurant. Built for the chef.
          </p>
          <p className="text-sm text-stone-400">
            &copy; {new Date().getFullYear()} My AI Sous Chef
          </p>
        </div>
      </footer>
    </main>
  )
}
