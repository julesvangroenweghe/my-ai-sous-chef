import { SupabaseProvider } from '@/providers/supabase-provider'
import { KitchenProvider } from '@/providers/kitchen-provider'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { UnitPreferencesProvider } from '@/components/UnitPreferencesProvider'
import { Toaster } from '@/components/ui/toaster'
import { CommandPalette } from '@/components/ui/command-palette'
import { PageTransition } from '@/components/ui/page-transition'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SupabaseProvider>
      <KitchenProvider>
        <UnitPreferencesProvider>
          <div className="flex min-h-[100dvh]" style={{ background: '#f8fafc' }}>
            <Sidebar />
            {/* Main content — offset by sidebar width */}
            <main
              className="flex-1 min-w-0"
              style={{
                marginLeft: 232,
                background: '#f8fafc',
                minHeight: '100dvh',
              }}
            >
              <div style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 40px' }}>
                <PageTransition>
                  {children}
                </PageTransition>
              </div>
            </main>
            <JulesAI />
          </div>
          {/* Global UI */}
          <Toaster />
          <CommandPalette />
        </UnitPreferencesProvider>
      </KitchenProvider>
    </SupabaseProvider>
  )
}
