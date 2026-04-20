import { SupabaseProvider } from '@/providers/supabase-provider'
import { KitchenProvider } from '@/providers/kitchen-provider'
import Sidebar from '@/components/layout/Sidebar'
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
 <div className="flex min-h-[100dvh]">
 <Sidebar />
 <main className="flex-1 min-w-0">
 <div className="max-w-7xl mx-auto pl-14 pr-6 md:px-8 lg:px-12 py-8">
 {children}
 </div>
 </main>
 </div>
       </UnitPreferencesProvider>
    </KitchenProvider>
 </SupabaseProvider>
 )
}
