import Sidebar from '@/components/layout/Sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-[100dvh]">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto px-6 md:px-8 lg:px-12 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
