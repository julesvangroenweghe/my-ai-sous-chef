import type { Metadata, Viewport } from 'next'
import { Outfit, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'

const outfit = Outfit({ 
 subsets: ['latin'],
 variable: '--font-outfit',
})

const jetbrainsMono = JetBrains_Mono({
 subsets: ['latin'],
 variable: '--font-mono',
})

export const metadata: Metadata = {
 title: 'My AI Sous Chef',
 description: 'Your intelligent kitchen companion — sold to the restaurant, built for the chef.',
 manifest: '/manifest.json',
 icons: {
   icon: [
     { url: '/favicon.ico', sizes: 'any' },
   ],
   apple: '/apple-touch-icon.png',
 },
 appleWebApp: {
   capable: true,
   statusBarStyle: 'default',
   title: 'Sous Chef',
 },
}

export const viewport: Viewport = {
 themeColor: '#D97706',
 width: 'device-width',
 initialScale: 1,
 maximumScale: 1,
}

export default function RootLayout({
 children,
}: {
 children: React.ReactNode
}) {
 return (
   <html lang="en">
     <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans`}>
       {children}
       <ServiceWorkerRegistration />
     </body>
   </html>
 )
}
