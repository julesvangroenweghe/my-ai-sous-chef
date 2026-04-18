'use client'

import { EventForm } from '@/components/events/event-form'

export default function NewEventPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Event</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Plan a new event — set details, build the menu, and generate your MEP
        </p>
      </div>
      <EventForm mode="create" />
    </div>
  )
}
