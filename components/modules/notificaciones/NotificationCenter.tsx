"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCircle, AlertTriangle, Info, UserPlus, Package, Settings, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

interface Notification {
    _id: string
    type: "ticket_response" | "low_stock" | "new_user" | "product_update" | "system_alert"
    title: string
    message: string
    read: boolean
    priority: "low" | "medium" | "high"
    data?: any
    createdAt: string
}

const TYPE_CONFIG = {
    ticket_response: { 
        icon: CheckCircle, 
        color: "text-emerald-600 bg-emerald-50 border-emerald-200",
        title: "Respuesta a Ticket"
    },
    low_stock: { 
        icon: AlertTriangle, 
        color: "text-red-600 bg-red-50 border-red-200",
        title: "Stock Bajo"
    },
    new_user: { 
        icon: UserPlus, 
        color: "text-blue-600 bg-blue-50 border-blue-200",
        title: "Nuevo Usuario"
    },
    product_update: { 
        icon: Package, 
        color: "text-purple-600 bg-purple-50 border-purple-200",
        title: "Actualización de Producto"
    },
    system_alert: { 
        icon: Settings, 
        color: "text-orange-600 bg-orange-50 border-orange-200",
        title: "Alerta del Sistema"
    }
}

const PRIORITY_CONFIG = {
    low: { label: "Baja", color: "bg-gray-100 text-gray-600" },
    medium: { label: "Media", color: "bg-yellow-100 text-yellow-600" },
    high: { label: "Alta", color: "bg-red-100 text-red-600" }
}

export default function NotificationCenter() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState<"all" | "unread">("all")

    useEffect(() => {
        fetchNotifications()
    }, [])

    const fetchNotifications = async () => {
        try {
            const res = await fetch("/api/notificaciones")
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
                console.log("🔔 Notificaciones cargadas:", data)
            }
        } catch (error) {
            console.error("Error al cargar notificaciones:", error)
        } finally {
            setLoading(false)
        }
    }

    const markAsRead = async (notificationId: string) => {
        try {
            const res = await fetch("/api/notificaciones", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationIds: [notificationId] })
            })

            if (res.ok) {
                setNotifications(prev => 
                    prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
                )
                console.log("✅ Notificación marcada como leída")
            }
        } catch (error) {
            console.error("Error al marcar notificación como leída:", error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.read).map(n => n._id)
            
            if (unreadIds.length === 0) return

            const res = await fetch("/api/notificaciones", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ notificationIds: unreadIds })
            })

            if (res.ok) {
                setNotifications(prev => 
                    prev.map(n => ({ ...n, read: true }))
                )
                console.log(`✅ ${unreadIds.length} notificaciones marcadas como leídas`)
                toast.success("Todas las notificaciones marcadas como leídas")
            }
        } catch (error) {
            console.error("Error al marcar todas como leídas:", error)
            toast.error("Error al marcar notificaciones como leídas")
        }
    }

    const filteredNotifications = filter === "unread" 
        ? notifications.filter(n => !n.read)
        : notifications

    const unreadCount = notifications.filter(n => !n.read).length

    const getTypeIcon = (type: string) => {
        return TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]?.icon || Bell
    }

    const getTypeColor = (type: string) => {
        return TYPE_CONFIG[type as keyof typeof TYPE_CONFIG]?.color || "text-gray-600 bg-gray-50 border-gray-200"
    }

    const getPriorityColor = (priority: string) => {
        return PRIORITY_CONFIG[priority as keyof typeof PRIORITY_CONFIG]?.color || "bg-gray-100 text-gray-600"
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Centro de Notificaciones
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {unreadCount} no leídas
                            </Badge>
                        )}
                    </CardTitle>
                    <CardDescription>
                        Todas las alertas y mensajes importantes del sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Filtros */}
                    <div className="flex gap-2 mb-4">
                        <Button
                            variant={filter === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("all")}
                        >
                            Todas
                        </Button>
                        <Button
                            variant={filter === "unread" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setFilter("unread")}
                        >
                            No leídas
                        </Button>
                        {unreadCount > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={markAllAsRead}
                            >
                                Marcar todas como leídas
                            </Button>
                        )}
                    </div>

                    {/* Lista de notificaciones */}
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                            <span className="ml-2">Cargando notificaciones...</span>
                        </div>
                    ) : filteredNotifications.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No tienes notificaciones</p>
                            <p className="text-sm">Las alertas y mensajes aparecerán aquí.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredNotifications.map((notification) => {
                                const Icon = getTypeIcon(notification.type)
                                const typeColor = getTypeColor(notification.type)
                                const priorityColor = getPriorityColor(notification.priority)
                                
                                return (
                                    <div 
                                        key={notification._id}
                                        className={`border rounded-lg p-4 transition-all hover:shadow-md ${
                                            notification.read ? 'opacity-60' : ''
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`p-2 rounded-full ${typeColor}`}>
                                                <Icon className="h-5 w-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-semibold text-sm">
                                                            {notification.title}
                                                        </h4>
                                                        <Badge variant="outline" className={priorityColor}>
                                                            {PRIORITY_CONFIG[notification.priority as keyof typeof PRIORITY_CONFIG]?.label}
                                                        </Badge>
                                                    </div>
                                                    {!notification.read && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => markAsRead(notification._id)}
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    {formatDate(notification.createdAt)}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-3 pt-3 border-t">
                                            <p className="text-sm whitespace-pre-wrap">
                                                {notification.message}
                                            </p>
                                            {notification.data && (
                                                <div className="mt-2 p-2 bg-muted/30 rounded text-xs">
                                                    <pre className="whitespace-pre-wrap">
                                                        {JSON.stringify(notification.data, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
