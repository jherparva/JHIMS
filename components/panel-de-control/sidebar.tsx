"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { MENU_ITEMS } from "@/lib/menu-config"
import { LogOut, AlertTriangle, Bell } from "lucide-react"
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

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/autenticacion/logout", { method: "POST" })
      if (response.ok) {
        toast.success("Sesión cerrada correctamente")
        router.push("/inicio-sesion")
      }
    } catch (error) {
      toast.error("Error al cerrar sesión")
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
    </div>
  )
}
