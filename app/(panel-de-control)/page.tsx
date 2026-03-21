"use client"

export const dynamic = "force-dynamic";

import { useEffect } from "react"

import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

export default function PanelDeControlPage() {
    const router = useRouter()

    useEffect(() => {
        // Redirigir automáticamente al dashboard
        router.replace("/dashboard")
    }, [router])

    return (
        <div className="min-h-screen flex items-center justify-center">
            <div className="flex items-center gap-2">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Cargando panel de control...</span>
            </div>
        </div>
    )
}
