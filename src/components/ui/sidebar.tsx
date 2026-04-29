'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SidebarProps extends React.HTMLAttributes<HTMLElement> {
  collapsed?: boolean
}

function Sidebar({ className, collapsed, children, ...props }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex flex-col bg-[#F2E8D5] text-[#2C1810] h-screen sticky top-0 transition-all duration-300 border-r border-[#E8D5B5]',
        collapsed ? 'w-16' : 'w-64',
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

function SidebarHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4', className)} {...props} />
}

function SidebarContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-3 py-2', className)} {...props} />
}

function SidebarFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 border-t border-[#E8D5B5]', className)} {...props} />
}

interface SidebarItemProps extends React.HTMLAttributes<HTMLAnchorElement> {
  href: string
  icon?: React.ReactNode
  active?: boolean
}

function SidebarItem({ className, href, icon, active, children, ...props }: SidebarItemProps) {
  return (
    <a
      href={href}
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'bg-[#FEF3E2] text-[#E8A040] border-l-2 border-[#E8A040] pl-[10px]'
          : 'text-[#9E7E60] hover:bg-[#EDE0C4] hover:text-[#2C1810]',
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </a>
  )
}

export { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarItem }
