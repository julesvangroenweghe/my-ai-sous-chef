"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, CalendarDays, MapPin, Users, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function EventsPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [guestCount, setGuestCount] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  const { toast } = useToast();
  const utils = trpc.useUtils();
  const eventsQuery = trpc.event.list.useQuery(undefined, { retry: false });

  const createMutation = trpc.event.create.useMutation({
    onSuccess: () => {
      utils.event.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast({ title: "Event created successfully" });
    },
    onError: (error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.event.delete.useMutation({
    onSuccess: () => {
      utils.event.list.invalidate();
      toast({ title: "Event deleted" });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEventDate("");
    setLocation("");
    setGuestCount("");
    setBudget("");
    setNotes("");
  };

  const handleCreate = () => {
    createMutation.mutate({
      title,
      description: description || undefined,
      eventDate: new Date(eventDate).toISOString(),
      location: location || undefined,
      guestCount: guestCount ? parseInt(guestCount) : undefined,
      budget: budget ? parseFloat(budget) : undefined,
      notes: notes || undefined,
    });
  };

  const statusColor: Record<string, string> = {
    planning: "bg-blue-500/10 text-blue-500",
    confirmed: "bg-green-500/10 text-green-500",
    completed: "bg-gray-500/10 text-gray-400",
    cancelled: "bg-red-500/10 text-red-400",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Events</h1>
          <p className="text-gray-400 mt-1">Plan and manage your catering events</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
              <Plus className="mr-2 h-4 w-4" /> New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#111] border-[#1a1a1a]">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
              <DialogDescription>Plan a new catering event.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea id="desc" value={description} onChange={(e) => setDescription(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">Date *</Label>
                  <Input id="date" type="datetime-local" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guests">Guest Count</Label>
                  <Input id="guests" type="number" value={guestCount} onChange={(e) => setGuestCount(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="budget">Budget ($)</Label>
                  <Input id="budget" type="number" value={budget} onChange={(e) => setBudget(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} className="bg-[#0a0a0a] border-[#2a2a2a]" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-[#2a2a2a]">Cancel</Button>
              <Button onClick={handleCreate} disabled={!title || !eventDate || createMutation.isPending} className="bg-amber-500 hover:bg-amber-600 text-black">
                {createMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {eventsQuery.isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
        </div>
      ) : eventsQuery.data?.events.length === 0 ? (
        <Card className="bg-[#111] border-[#1a1a1a]">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500 mb-4">No events found</p>
            <Button onClick={() => setDialogOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-black">
              <Plus className="mr-2 h-4 w-4" /> Plan your first event
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {eventsQuery.data?.events.map((event) => (
            <Card key={event.id} className="bg-[#111] border-[#1a1a1a] hover:border-amber-500/30 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-red-400"
                    onClick={() => deleteMutation.mutate({ id: event.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-400">
                  <div className="flex items-center">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {new Date(event.eventDate).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                  </div>
                  {event.location && (
                    <div className="flex items-center">
                      <MapPin className="mr-2 h-4 w-4" />
                      {event.location}
                    </div>
                  )}
                  {event.guestCount ? (
                    <div className="flex items-center">
                      <Users className="mr-2 h-4 w-4" />
                      {event.guestCount} guests
                    </div>
                  ) : null}
                </div>
                <div className="mt-3">
                  <Badge className={statusColor[event.status] ?? statusColor.planning}>
                    {event.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
