import React from 'react'
import { SidebarProvider } from '@/components/ui/sidebar'
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
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <div className="flex-1 flex flex-col">
            <AppHeader />
            <main className="flex-1 overflow-auto">
              <div className="p-6 w-full max-w-none">
                {children}
              </div>
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ProductProvider>
  )
}