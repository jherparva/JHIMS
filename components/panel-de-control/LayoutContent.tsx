"use client"

import { Header } from "./header"
import { useLayout } from "@/components/proveedores-componentes/LayoutProvider"

export function LayoutContent({ children, user }: { children: React.ReactNode, user: any }) {
    const { isVisualMode } = useLayout()

    return (
        <div className={`flex flex-1 flex-col overflow-hidden transition-all duration-300 ${isVisualMode ? 'w-full' : ''}`}>
            <Header user={user} />

            <main
                className={`flex-1 overflow-y-auto p-6 md:p-8 bg-muted/10 
                 backdrop-blur-sm shadow-inner 
                 transition-all duration-300 ${isVisualMode ? 'rounded-none' : 'rounded-tl-3xl'}`}
            >
                {children}
            </main>
        </div>
    )
}
