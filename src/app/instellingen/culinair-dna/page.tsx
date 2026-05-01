'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// This page was moved to the (dashboard) route group
// Redirect to the correct URL
export default function Redirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/instellingen/culinair-dna') }, [router])
  return null
}
