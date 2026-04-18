import { AppSidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { MobileNav } from '@/components/layout/mobile-nav'
import { ToastProvider } from '@/components/ui/toast'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-gray-50/50">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 pb-20 md:pb-6">{children}</main>
        </div>
        <MobileNav />
      </div>
    </ToastProvider>
  )
}
