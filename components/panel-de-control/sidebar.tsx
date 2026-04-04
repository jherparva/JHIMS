"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MENU_ITEMS } from "@/lib/menu-config"
import { LogOut, AlertTriangle, Bell, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Logo } from "@/components/logo"
import useSWR from "swr"
import type { SessionUser } from "@/lib/auth"

const fetcher = (url: string) => fetch(url).then(res => res.json())


// const menuItems removed in favor of shared config

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const { data: stats } = useSWR(user && user.role !== "superadmin" ? "/api/dashboard" : null, fetcher, { refreshInterval: 60000 })
  const lowStockCount = stats?.lowStockProducts?.length || 0

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch("/api/autenticacion/me")
        if (response.ok) {
          const data = await response.json()
          setUser(data.user)
        }
      } catch (error) {
        console.error("Error al obtener usuario:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Filtrar elementos del menú basados en permisos
  const filteredMenuItems = MENU_ITEMS.filter((item) => {
    if (loading || !user) return false

    // Si es adminOnly, verificar si es admin
    if (item.adminOnly) {
      return user.role === "admin" || user.role === "superadmin"
    }

    // Mostrar todos los demás items
    return true
  })

  const executeLogout = async () => {
    setIsLoggingOut(true)
    try {
      const response = await fetch("/api/autenticacion/logout", { method: "POST" })
      if (response.ok) {
        toast.success("Sesión cerrada correctamente")
        router.push("/inicio-sesion")
      }
    } catch (error) {
      toast.error("Error al cerrar sesión")
    } finally {
      setIsLoggingOut(false)
      setShowLogoutConfirm(false)
    }
  }

  const handleGoToCloseBox = () => {
    setShowLogoutConfirm(false)
    localStorage.setItem('jhims_logout_after_close', 'true')
    router.push('/punto-de-venta?action=arqueo')
  }

  const handleLogout = async () => {
    try {
      // Check for active POS session
      try {
        const sessionRes = await fetch("/api/caja/session");
        if (sessionRes.ok) {
          const sessionData = await sessionRes.json();
          if (sessionData && sessionData.activeSession && sessionData.activeSession._id) {
            setShowLogoutConfirm(true) // Show custom visual modal
            return;
          }
        }
      } catch (e) {
        // Ignorar si hay error de red o no existe la ruta, procedemos al logout
      }
      
      // Si no hubo caja abierta, cerrar sesión de inmediato
      executeLogout();

    } catch (error) {
      toast.error("Error al procesar el cierre de sesión")
    }
  }

  return (
    <div className="flex h-full w-64 flex-col border-r bg-gradient-to-b from-background to-muted/40 shadow-lg print:hidden">
      {/* Logo corporativo horizontal */}
      <div className="flex flex-col py-8 items-center justify-center border-b px-2 bg-background/60 backdrop-blur overflow-hidden">
        <Logo 
          size="small" 
          layout="horizontal" 
          variant="full" 
          animated={false} 
          dark={true}
          showTagline={false}
          className="scale-95" 
        />
      </div>

      {/* Navegación */}
      <nav className="flex-1 space-y-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : (
          filteredMenuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start relative transition-all duration-200 group/btn h-11",
                    "hover:bg-primary/5 hover:text-primary border border-transparent",
                    isActive &&
                    "bg-white/80 dark:bg-white/10 text-primary font-bold shadow-md border-slate-200/50 dark:border-white/10 backdrop-blur-md scale-[1.02]",
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-lg mr-2 transition-transform group-hover/btn:scale-110",
                    isActive ? "bg-primary text-white shadow-primary/20" : "bg-muted/50 text-slate-500"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1">{item.title}</span>
                  
                  {/* Indicators / Badges */}
                  {item.title === "Inventario" && lowStockCount > 0 && (
                    <div className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white animate-pulse shadow-lg shadow-rose-200/50">
                      {lowStockCount}
                    </div>
                  )}
                  {isActive && (
                    <div className="absolute -left-4 w-1 h-6 bg-primary rounded-r-full shadow-lg shadow-primary/50" />
                  )}
                </Button>
              </Link>
            )
          })
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-muted/50 p-4">
        <Button
          variant="destructive"
          className="w-full justify-start transition-all hover:translate-x-1"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>

      {/* --- MODAL DE ADVERTENCIA AL CERRAR SESIÓN CON CAJA ABIERTA --- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => !isLoggingOut && setShowLogoutConfirm(false)} />
            <div className="relative bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl w-full max-w-sm p-6 overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
                
                <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0 shadow-[0_0_20px_1px_rgba(245,158,11,0.2)]">
                        <AlertTriangle className="h-8 w-8" />
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="font-black text-white text-xl tracking-tight">¡Tienes una Caja Abierta!</h3>
                        <p className="text-slate-400 text-sm leading-relaxed px-2">
                            Aún no has hecho el cuadre ni el cierre de la caja. ¿Estás absolutamente seguro de que quieres abandonar la sesión?
                        </p>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2 pt-6 mt-2">
                    <button
                        onClick={handleGoToCloseBox}
                        disabled={isLoggingOut}
                        className="w-full px-4 py-3 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 border-b-2 border-b-emerald-700 text-white rounded-2xl text-sm font-black tracking-wide flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Ir a Cierre de Caja rápido
                    </button>
                    
                    <div className="flex gap-2 w-full mt-1">
                        <button
                            onClick={() => setShowLogoutConfirm(false)}
                            disabled={isLoggingOut}
                            className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 border-b-2 border-b-slate-900 text-white rounded-2xl text-sm font-bold transition-all disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={executeLogout}
                            disabled={isLoggingOut}
                            className="flex-1 px-4 py-3 bg-rose-600 hover:bg-rose-500 border border-rose-500 border-b-2 border-b-rose-700 text-white rounded-2xl text-sm font-black tracking-wide flex justify-center items-center gap-2 transition-all disabled:opacity-50"
                        >
                            {isLoggingOut ? <RefreshCw className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                            Forzar Salida
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  )
}
