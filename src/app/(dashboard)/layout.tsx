import { SupabaseProvider } from '@/providers/supabase-provider'
import { KitchenProvider } from '@/providers/kitchen-provider'
import Sidebar from '@/components/layout/Sidebar'
import JulesAI from '@/components/layout/JulesAI'
import { UnitPreferencesProvider } from '@/components/UnitPreferencesProvider'

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
            <main className="flex-1 min-w-0" style={{ background: '#f8fafc' }}>
              <div className="max-w-7xl mx-auto pl-14 pr-6 md:px-8 lg:px-10 py-8">
                {children}
              </div>
            </main>
          </div>
          <JulesAI />
        </UnitPreferencesProvider>
      </KitchenProvider>
    </SupabaseProvider>
  )
}
