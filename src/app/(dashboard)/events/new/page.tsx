'use client'

import { EventForm } from '@/components/events/event-form'

export default function NewEventPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Event</h1>
        <p className="text-muted-foreground text-sm mt-1">Plan a new event with menu and logistics</p>
      </div>
      <EventForm />
    </div>
  )
}
