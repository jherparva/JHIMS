import type React from "react"
import { getSession } from "@/lib/auth"
import { redirect } from "next/navigation"

// Componente cliente para el logout
import LogoutButton from "./logout-button"
import { SessionShield } from "@/components/autenticacion/SessionShield"

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
    const user = await getSession()

    if (!user) {
        redirect("/inicio-sesion")
    }

    if (user.role !== "superadmin") {
        redirect("/dashboard")
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white">
            {/* Escudo de sesión (bloquea si cambias a usuario normal en otra pestaña) */}
            <SessionShield initialUserId={user.id} initialRole={user.role} />
            {/* Barra superior del superadmin */}
            <header className="bg-slate-900 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center text-sm font-bold">
                        SA
                    </div>
                    <div>
                        <span className="font-bold text-white">JHIMS</span>
                        <span className="ml-2 text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full">
                            Super Admin
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="text-sm text-slate-400">
                        {user.username}
                    </span>
                    <LogoutButton />
                </div>
            </header>

            {/* Contenido */}
            <main className="p-6">
                {children}
            </main>
        </div>
    )
}
