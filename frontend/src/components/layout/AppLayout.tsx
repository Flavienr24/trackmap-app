import React from 'react'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { ProductProvider } from '@/contexts/ProductContext'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  return (
    <ProductProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <AppHeader />
          <main className="flex-1 overflow-auto p-6 w-full">
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProductProvider>
  )
}