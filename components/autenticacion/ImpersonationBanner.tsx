"use client"

import { useState } from "react"
import { ShieldAlert, ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export function ImpersonationBanner({ user }: { user: any }) {
    const [isStopping, setIsStopping] = useState(false)

    if (!user?.impersonatedBy) return null

    const stopImpersonation = async () => {
        setIsStopping(true)
        try {
            const res = await fetch("/api/usuarios/stop-impersonating", { method: "POST" })
            if (res.ok) {
                const data = await res.json()
                toast.success(data.message)
                window.location.href = data.redirect || "/usuarios"
            } else {
                toast.error("Error al salir de la simulación")
            }
        } catch (error) {
            toast.error("Error de conexión")
        } finally {
            setIsStopping(false)
        }
    }

    return (
        <div className="fixed top-0 left-0 w-full bg-amber-600 text-white px-4 py-2 flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top duration-500 z-[9999]">
            <div className="flex items-center gap-3">
                <div className="bg-white/20 p-1.5 rounded-lg">
                    <ShieldAlert className="h-4 w-4" />
                </div>
                <div className="text-sm">
                    <span className="font-bold">Modo Simulación:</span> Estás viendo el sistema como <span className="font-extrabold underline">{user.fullName}</span>.
                </div>
            </div>
            <button
                onClick={stopImpersonation}
                disabled={isStopping}
                className="flex items-center gap-2 px-3 py-1.5 bg-white text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-50 transition-colors shadow-sm disabled:opacity-50"
            >
                {isStopping ? (
                    <div className="h-3 w-3 border-2 border-amber-700 border-t-transparent animate-spin rounded-full" />
                ) : (
                    <ArrowLeft className="h-3 w-3" />
                )}
                VOLVER AL PANEL ADMIN
            </button>
        </div>
    )
}
