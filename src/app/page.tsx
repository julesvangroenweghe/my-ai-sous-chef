export const dynamic = "force-dynamic";
import Link from "next/link";
import { ChefHat, BookOpen, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-[#1a1a1a]">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center space-x-2">
            <ChefHat className="h-7 w-7 text-amber-500" />
            <span className="text-xl font-bold">AI Sous Chef</span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-24 text-center">
        <div className="inline-flex items-center rounded-full border border-amber-500/20 bg-amber-500/10 px-4 py-1.5 text-sm text-amber-500 mb-8">
          <Sparkles className="mr-2 h-4 w-4" />
          AI-Powered Kitchen Management
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Your Kitchen,{" "}
          <span className="text-amber-500">Elevated</span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
          Manage recipes, plan events, and create menus with the power of AI.
          Built for professional chefs who demand excellence.
        </p>
        <Link href="/register">
          <Button size="lg" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold text-lg px-8 py-6">
            Start Cooking Smarter
          </Button>
        </Link>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: BookOpen,
              title: "Recipe Management",
              description: "Organize your entire recipe collection with smart categorization, ingredient tracking, and cost analysis.",
            },
            {
              icon: CalendarDays,
              title: "Event Planning",
              description: "Plan and manage catering events with guest counts, budgets, and timelines all in one place.",
            },
            {
              icon: Sparkles,
              title: "AI Assistant",
              description: "Get AI-powered suggestions for menu combinations, ingredient substitutions, and recipe scaling.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-[#1a1a1a] bg-[#111] p-8 hover:border-amber-500/30 transition-colors"
            >
              <feature.icon className="h-10 w-10 text-amber-500 mb-4" />
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1a1a1a] py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          © 2024 My AI Sous Chef. Built for professional chefs.
        </div>
      </footer>
    </div>
  );
}
