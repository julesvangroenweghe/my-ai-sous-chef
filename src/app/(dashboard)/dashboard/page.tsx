export const dynamic = "force-dynamic";
"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, CalendarDays, ClipboardList, TrendingUp } from "lucide-react";
import { trpc } from "@/lib/trpc/client";

export default function DashboardPage() {
  const recipesQuery = trpc.recipe.list.useQuery(undefined, { retry: false });
  const eventsQuery = trpc.event.list.useQuery({ upcoming: true }, { retry: false });
  const menusQuery = trpc.menu.list.useQuery(undefined, { retry: false });

  const stats = [
    {
      title: "Total Recipes",
      value: recipesQuery.data?.recipes.length ?? 0,
      icon: BookOpen,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Upcoming Events",
      value: eventsQuery.data?.events.length ?? 0,
      icon: CalendarDays,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      title: "Active Menus",
      value: menusQuery.data?.menus.length ?? 0,
      icon: ClipboardList,
      color: "text-purple-500",
      bg: "bg-purple-500/10",
    },
    {
      title: "This Month",
      value: eventsQuery.data?.events.filter(
        (e) => new Date(e.eventDate).getMonth() === new Date().getMonth()
      ).length ?? 0,
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
              <div className="text-3xl font-bold">{stat.value}</div>
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
            {recipesQuery.isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : recipesQuery.data?.recipes.length === 0 ? (
              <p className="text-gray-500">No recipes yet. Create your first recipe!</p>
            ) : (
              <div className="space-y-3">
                {recipesQuery.data?.recipes.slice(0, 5).map((recipe) => (
                  <div key={recipe.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <div>
                      <p className="font-medium">{recipe.title}</p>
                      <p className="text-sm text-gray-500">{recipe.cuisine ?? "Uncategorized"}</p>
                    </div>
                    {recipe.course && (
                      <span className="text-xs bg-amber-500/10 text-amber-500 px-2 py-1 rounded-full">
                        {recipe.course}
                      </span>
                    )}
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
            {eventsQuery.isLoading ? (
              <p className="text-gray-500">Loading...</p>
            ) : eventsQuery.data?.events.length === 0 ? (
              <p className="text-gray-500">No upcoming events. Plan your next event!</p>
            ) : (
              <div className="space-y-3">
                {eventsQuery.data?.events.slice(0, 5).map((event) => (
                  <div key={event.id} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(event.eventDate).toLocaleDateString()}
                        {event.guestCount ? ` · ${event.guestCount} guests` : ""}
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
