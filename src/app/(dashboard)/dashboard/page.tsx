"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarDays, ClipboardList, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function DashboardPage() {
  const supabase = createClient();
  const [recipes, setRecipes] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const [recipesRes, eventsRes] = await Promise.all([
        supabase.from("recipes").select("*").order("created_at", { ascending: false }).limit(10),
        supabase.from("events").select("*").order("event_date", { ascending: true }).limit(10),
      ]);
      setRecipes(recipesRes.data ?? []);
      setEvents(eventsRes.data ?? []);
      setLoading(false);
    }
    fetchData();
  }, []);

  const stats = [
    {
      title: "Total Recipes",
      value: recipes.length,
      icon: BookOpen,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Upcoming Events",
      value: events.length,
      icon: CalendarDays,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Active Menus",
      value: events.filter((e) => e.status === "confirmed").length,
      icon: ClipboardList,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "This Month",
      value: events.filter(
        (e) => new Date(e.event_date).getMonth() === new Date().getMonth()
      ).length,
      icon: TrendingUp,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-gray-400 mt-1">Welcome back, Chef. Here&apos;s your kitchen overview.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="bg-[#111] border-[#1a1a1a]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-400">
                {stat.title}
              </CardTitle>
              <div className={`${stat.bg} p-2 rounded-lg`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? "..." : stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="bg-[#111] border-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-lg">Recent Recipes</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : recipes.length === 0 ? (
              <p className="text-gray-500">No recipes yet. Create your first recipe!</p>
            ) : (
              <div className="space-y-3">
                {recipes.slice(0, 5).map((recipe) => (
                  <div key={recipe.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <div>
                      <p className="font-medium">{recipe.name}</p>
                      <p className="text-sm text-gray-500">{recipe.description ?? "No description"}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-[#111] border-[#1a1a1a]">
          <CardHeader>
            <CardTitle className="text-lg">Upcoming Events</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-gray-500">Loading...</p>
            ) : events.length === 0 ? (
              <p className="text-gray-500">No upcoming events. Plan your next event!</p>
            ) : (
              <div className="space-y-3">
                {events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <div>
                      <p className="font-medium">{event.name}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.event_date).toLocaleDateString()}
                        {event.guest_count ? ` · ${event.guest_count} guests` : ""}
                      </p>
                    </div>
                    <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded-full">
                      {event.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
