import { SupabaseProvider } from '@/providers/supabase-provider'
import { KitchenProvider } from '@/providers/kitchen-provider'
import { UnitPreferencesProvider } from '@/components/UnitPreferencesProvider'
import { Toaster } from '@/components/ui/toaster'
import { CommandPalette } from '@/components/ui/command-palette'
import { DashboardLayoutClient } from '@/components/layout/DashboardLayoutClient'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SupabaseProvider>
      <KitchenProvider>
        <UnitPreferencesProvider>
          <DashboardLayoutClient>
            {children}
          </DashboardLayoutClient>
          <Toaster />
          <CommandPalette />
        </UnitPreferencesProvider>
      </KitchenProvider>
    </SupabaseProvider>
  )
}
