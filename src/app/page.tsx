import Link from 'next/link'
import { ChefHat, ArrowRight, Utensils, Calendar, Brain } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sidebar to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="max-w-2xl mx-auto text-center space-y-8">
        <div className="flex items-center justify-center gap-3 mb-4">
          <div className="p-3 bg-sidebar-accent/20 rounded-2xl">
            <ChefHat className="h-12 w-12 text-sidebar-accent" />
          </div>
        </div>

        <h1 className="text-5xl font-bold text-white tracking-tight">
          My AI Sous Chef
        </h1>
        <p className="text-xl text-slate-300 max-w-lg mx-auto">
          Your intelligent kitchen companion. Manage recipes, plan events, track costs — all with AI by your side.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <Utensils className="h-6 w-6 text-sidebar-accent mb-2" />
            <h3 className="text-white font-semibold text-sm">Recipe Management</h3>
            <p className="text-slate-400 text-xs mt-1">Components, ingredients, costing — all in one place.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <Calendar className="h-6 w-6 text-sidebar-accent mb-2" />
            <h3 className="text-white font-semibold text-sm">Event & MEP Planning</h3>
            <p className="text-slate-400 text-xs mt-1">Build menus, scale ingredients, generate MEP sheets.</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-left">
            <Brain className="h-6 w-6 text-sidebar-accent mb-2" />
            <h3 className="text-white font-semibold text-sm">Jules AI</h3>
            <p className="text-slate-400 text-xs mt-1">Smart suggestions that learn your cooking style.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-sidebar-accent hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors"
          >
            Get Started <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors"
          >
            Create Account
          </Link>
        </div>

        <p className="text-slate-500 text-sm">
          Sold to the restaurant. Built for the chef.
        </p>
      </div>
    </div>
  )
}
