"use client"

import { Fragment } from "react"
import { LogOut, User, Sun, Moon, Bell, Home, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter, usePathname } from "next/navigation"
import { toast } from "sonner"
import { useTheme } from "next-themes"
import type { SessionUser } from "@/lib/auth"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { getAllFromLocal, isOnline } from "@/lib/offline-storage"
import { NotificationsModal } from "./NotificationsModal"
import { useLayout } from "@/components/proveedores-componentes/LayoutProvider"
import { LayoutDashboard, List } from "lucide-react"
import { Logo } from "@/components/logo"

interface HeaderProps {
  user: SessionUser
}

export function Header({ user }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { isVisualMode, toggleVisualMode } = useLayout()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOnlineStatus, setIsOnlineStatus] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)

  useEffect(() => {
    // Establecer estado inicial de conexión
    setIsOnlineStatus(navigator.onLine)

    // Escuchar cambios de conexión
    const handleOnline = () => setIsOnlineStatus(true)
    const handleOffline = () => setIsOnlineStatus(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
    const interval = setInterval(loadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async () => {
    try {
      if (isOnlineStatus) {
        // No cargar notificaciones automáticamente para evitar problemas
        // Solo mostrar badge si hay cookies de notificación
        const hasNotifications = document.cookie.includes('notification') || document.cookie.includes('static')
        if (hasNotifications) {
          setUnreadCount(3) // Mostrar 3 como ejemplo
        } else {
          setUnreadCount(0)
        }
        console.log(`🔔 Estado de notificaciones: ${hasNotifications ? 'Con notificaciones' : 'Sin notificaciones'}`)
      }
    } catch (error) {
      console.error("[v0] Error al cargar notificaciones:", error)
    }
  }

  const markTicketsAsRead = async () => {
    try {
      // Limpiar contador de notificaciones
      setUnreadCount(0)
      
      // También limpiar cookies de notificaciones
      document.cookie.split(';').forEach(cookie => {
        const eqPos = cookie.indexOf('=')
        const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim()
        if (name.includes('notification') || name.includes('static')) {
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=localhost`
        }
      })
      
      console.log("✅ Todas las notificaciones marcadas como leídas")
      toast.success("Notificaciones limpiadas")
      
      // Redirigir a la página de notificaciones
      router.push("/notificaciones")
    } catch (error) {
      console.error("Error al marcar tickets como leídos:", error)
    }
  }

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/autenticacion/logout", { method: "POST" })
      if (response.ok) {
        toast.success("Sesión cerrada exitosamente")
        router.push("/inicio-sesion")
        router.refresh()
      } else {
        toast.error("Error al cerrar sesión")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Error de conexión")
    }
  }

  const getInitials = (fullName: string) => {
    if (!fullName) return "U"
    const names = fullName.split(" ")
    return names.length >= 2 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : fullName.substring(0, 2).toUpperCase()
  }

  const pathname = usePathname()

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/70 backdrop-blur-md shadow-sm px-6 print:hidden">

        <div className="flex items-center gap-4">
          {isVisualMode && pathname !== "/dashboard" && (
            <Button variant="outline" onClick={() => router.push("/dashboard")} className="gap-2 border-primary/50 text-primary hover:bg-primary/10">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Menú Principal</span>
            </Button>
          )}
          <h1 className="text-2xl font-semibold tracking-tight text-primary flex items-center gap-3">
            {isVisualMode ? (
              <>
                <Logo size="xs" layout="horizontal" variant="full" animated={false} dark={true} showTagline={false} />
              </>
            ) : "Panel de Control"}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Estado de conexión */}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs ${isOnlineStatus ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
            {isOnlineStatus ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Online</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                <span>Offline</span>
              </>
            )}
          </div>

          <Button variant="ghost" size="icon" className="relative" onClick={() => {
            console.log("🔍 Header: Abriendo modal de notificaciones")
            setIsNotificationsOpen(true)
          }}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </Button>

          {/* Usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 hover:bg-accent/20">
                <Avatar className="h-8 w-8 ring-2 ring-primary/40">
                  <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start text-sm">
                  <span className="font-medium">{user?.fullName || 'Usuario'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/perfil")}>
                <User className="mr-2 h-4 w-4" /> Mi Perfil
              </DropdownMenuItem>
              {/* Visual Mode Toggle */}
              <DropdownMenuItem onClick={toggleVisualMode}>
                {isVisualMode ? (
                  <>
                    <List className="mr-2 h-4 w-4" /> Vista Clásica
                  </>
                ) : (
                  <>
                    <LayoutDashboard className="mr-2 h-4 w-4" /> Vista Visual
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
                {theme === "light" ? (
                  <>
                    <Moon className="mr-2 h-4 w-4" /> Modo Oscuro
                  </>
                ) : (
                  <>
                    <Sun className="mr-2 h-4 w-4" /> Modo Claro
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" /> Cerrar Sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      {/* Modal de Notificaciones */}
      <NotificationsModal 
        isOpen={isNotificationsOpen} 
        onClose={() => setIsNotificationsOpen(false)} 
        unreadCount={unreadCount} 
      />
    </>
  )
} 