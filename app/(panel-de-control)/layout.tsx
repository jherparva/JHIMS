import type React from "react"
import { Sidebar } from "@/components/panel-de-control/sidebar"
import { Header } from "@/components/panel-de-control/header"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

import { LayoutProvider } from "@/components/proveedores-componentes/LayoutProvider"
import { SidebarWrapper } from "@/components/panel-de-control/SidebarWrapper"
import { LayoutContent } from "@/components/panel-de-control/LayoutContent"
import { InactivityGuard } from "@/components/panel-de-control/InactivityGuard"
import { SessionShield } from "@/components/autenticacion/SessionShield"
import { ImpersonationBanner } from "@/components/autenticacion/ImpersonationBanner"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const user = await getSession()

    if (!user) {
        redirect("/inicio-sesion")
    }

    return (
        <LayoutProvider>
            {/* Guardia de inactividad (invisible, no renderiza nada) */}
            <InactivityGuard />
            {/* Escudo de sesión (detecta cambios de usuario en otras pestañas) */}
            <SessionShield initialUserId={user.id} initialRole={user.role} />
            
            <ImpersonationBanner user={user} />
            
            <div className={`flex h-screen overflow-hidden bg-gradient-to-br from-background to-muted/20 ${user.impersonatedBy ? 'mt-10' : ''}`}>
                {/* Sidebar */}
                <SidebarWrapper />

                {/* Contenido principal */}
                <LayoutContent user={user}>
                    {children}
                </LayoutContent>
            </div>
        </LayoutProvider>
    )
}
