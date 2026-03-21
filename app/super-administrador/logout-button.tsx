"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"

export default function LogoutButton() {
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleLogout = async () => {
        setIsLoading(true)
        
        try {
            // Limpieza AGRESIVA de todas las cookies y caché
            
            // 1. Limpiar cookies del lado del cliente (todas las variantes)
            const cookies = document.cookie.split(';')
            for (let cookie of cookies) {
                const eqPos = cookie.indexOf('=')
                const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
                document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`
            }
            
            // 2. Limpiar localStorage y sessionStorage
            localStorage.clear()
            sessionStorage.clear()
            
            // 3. Llamar al API de logout del servidor
            const response = await fetch("/api/autenticacion/logout", { method: "POST" })
            
            if (response.ok) {
                console.log("Logout exitoso, redirigiendo...")
                // 4. Forzar redirección completa con recarga de página
                window.location.href = '/inicio-sesion'
                // 5. Forzar recarga después de un pequeño delay
                setTimeout(() => {
                    window.location.reload()
                }, 100)
            } else {
                console.error("Error en logout del servidor")
                // Forzar redirección de todos modos
                window.location.href = '/inicio-sesion'
            }
        } catch (error) {
            console.error("Error de conexión en logout:", error)
            // Forzar redirección incluso si hay error
            window.location.href = '/inicio-sesion'
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <button
            onClick={handleLogout}
            disabled={isLoading}
            className="text-xs bg-red-900/40 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
            {isLoading ? (
                <>
                    <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                    Cerrando...
                </>
            ) : (
                <>
                    <LogOut className="h-3 w-3" />
                    Cerrar sesión
                </>
            )}
        </button>
    )
}
