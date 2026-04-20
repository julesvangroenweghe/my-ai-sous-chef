'use client'

import { Suspense } from 'react'
import IntegrationsContent from './IntegrationsContent'

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-stone-800 rounded w-48" />
          <div className="h-4 bg-stone-800 rounded w-96" />
          <div className="h-48 bg-stone-800 rounded-2xl" />
        </div>
      </div>
    }>
      <IntegrationsContent />
    </Suspense>
  )
}
