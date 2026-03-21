"use client"

import { useState, useEffect, useCallback } from "react"
import { ShieldAlert, RefreshCw, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

interface SessionShieldProps {
    initialUserId: string
    initialRole: string
}

/**
 * SessionShield Component
 * Detects if the global browser session has changed (different user logged in another tab)
 * and blocks the UI to prevent data corruption or unauthorized access.
 */
export function SessionShield({ initialUserId, initialRole }: SessionShieldProps) {
    const [isCompromised, setIsCompromised] = useState(false)
    const [currentIdentity, setCurrentIdentity] = useState<{ id: string, name: string, role: string } | null>(null)
    const router = useRouter()

    const checkSession = useCallback(async () => {
        try {
            // No-cache para asegurar que pedimos el estado real al servidor
            const response = await fetch("/api/autenticacion/me", { 
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            })
            
            if (response.status === 401) {
                // Sesión cerrada en otra pestaña o expirada
                setIsCompromised(true)
                setCurrentIdentity(null)
                return
            }

            if (response.ok) {
                const data = await response.json()
                const serverUserId = data.user.id
                
                // Si el ID del servidor es diferente al que cargó esta página originalmente
                if (serverUserId !== initialUserId) {
                    setIsCompromised(true)
                    setCurrentIdentity({
                        id: serverUserId,
                        name: data.user.fullName || data.user.username,
                        role: data.user.role
                    })
                } else {
                    // Si todo vuelve a la normalidad (por ejemplo, el usuario volvió a loguearse como el original)
                    // aunque esto es raro, permitimos restaurar el flujo
                    setIsCompromised(false)
                }
            }
        } catch (error) {
            console.error("Shield: Error checking session", error)
        }
    }, [initialUserId])

    useEffect(() => {
        // Verificar cada 10 segundos
        const interval = setInterval(checkSession, 10000)
        
        // Verificar inmediatamente cuando el usuario vuelve a enfocar la pestaña
        window.addEventListener("focus", checkSession)

        return () => {
            clearInterval(interval)
            window.removeEventListener("focus", checkSession)
        }
    }, [checkSession])

    if (!isCompromised) return null

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="max-w-md w-[90%] p-8 rounded-3xl border border-primary/20 bg-card shadow-2xl text-center space-y-6">
                <div className="relative mx-auto w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
                    <ShieldAlert className="w-10 h-10 text-destructive animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-2 border-destructive/20 animate-ping"></div>
                </div>

                <div className="space-y-2">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground">¡Conflicto de Sesión!</h2>
                    <p className="text-muted-foreground text-sm">
                        Se ha detectado que has iniciado sesión con un usuario diferente en otra ventana del navegador. 
                        Esta ventana ha sido bloqueada para evitar confusiones y errores en tus datos.
                    </p>
                </div>

                {currentIdentity ? (
                    <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 flex flex-col items-center">
                        <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2">Usuario Actual en el Navegador</span>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                                {currentIdentity.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div className="text-left">
                                <p className="font-bold text-base leading-tight">{currentIdentity.name}</p>
                                <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary rounded-full font-bold uppercase">
                                    {currentIdentity.role}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-destructive/5 rounded-2xl border border-destructive/20 text-destructive text-sm font-semibold">
                        Tu sesión ha sido cerrada o ha expirado.
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <Button 
                        size="lg" 
                        className="w-full gap-2 text-base font-bold h-14 rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="w-5 h-5" />
                        Refrescar esta Página
                    </Button>
                    <Button 
                        variant="ghost" 
                        className="w-full gap-2 rounded-xl text-muted-foreground"
                        onClick={() => router.push("/inicio-sesion")}
                    >
                        <LogOut className="w-4 h-4" />
                        Ir al Inicio de Sesión
                    </Button>
                </div>

                <div className="pt-2">
                    <div className="flex items-center justify-center gap-2">
                        <div className="h-[1px] w-8 bg-muted"></div>
                        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
                            JHIMS SECURITY SHIELD
                        </p>
                        <div className="h-[1px] w-8 bg-muted"></div>
                    </div>
                </div>
            </div>
        </div>
    )
}
