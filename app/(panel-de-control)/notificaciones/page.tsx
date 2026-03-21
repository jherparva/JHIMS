"use client"

import { useState, useEffect } from "react"
import { Bell, CheckCircle, AlertTriangle, UserPlus, Package, Settings, X } from "lucide-react"
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

export default function NotificacionesPage() {
    const [notifications, setNotifications] = useState<Notification[]>([
        {
            _id: "demo-1",
            type: "ticket_response",
            title: "🎫 Respuesta a tu ticket",
            message: "Esta es una notificación de demostración. El sistema está funcionando correctamente.",
            read: false,
            priority: "medium",
            createdAt: new Date().toISOString(),
            data: { ticketSubject: "Ticket de Demostración", response: "Respuesta de prueba" }
        },
        {
            _id: "demo-2",
            type: "low_stock",
            title: "⚠️ Stock Bajo",
            message: "El producto 'Demostración' tiene stock bajo. Actual: 3 unidades, mínimo: 10 unidades.",
            read: false,
            priority: "high",
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            data: { productName: "Demostración", currentStock: 3, minStock: 10 }
        },
        {
            _id: "demo-3",
            type: "new_user",
            title: "👤 Nuevo Usuario",
            message: "Se ha creado un nuevo usuario en tu empresa: demo@ejemplo.com",
            read: false,
            priority: "medium",
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            data: { newUserEmail: "demo@ejemplo.com", newUserRole: "seller" }
        }
    ])

    const markAsRead = async (notificationId: string) => {
        try {
            setNotifications(prev => 
                prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
            )
            console.log("✅ Notificación marcada como leída")
            toast.success("Notificación marcada como leída")
        } catch (error) {
            console.error("Error al marcar notificación como leída:", error)
        }
    }

    const markAllAsRead = async () => {
        try {
            const unreadIds = notifications.filter(n => !n.read).map(n => n._id)
            
            if (unreadIds.length === 0) return

            setNotifications(prev => 
                prev.map(n => ({ ...n, read: true }))
            )
            console.log(`✅ ${unreadIds.length} notificaciones marcadas como leídas`)
            toast.success("Todas las notificaciones marcadas como leídas")
        } catch (error) {
            console.error("Error al marcar todas como leídas:", error)
            toast.error("Error al marcar notificaciones como leídas")
        }
    }

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
                    </CardTitle>
                    <CardDescription>
                        Sistema de notificaciones y alertas del sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {/* Lista de notificaciones */}
                    <div className="space-y-3">
                        {notifications.map((notification) => {
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

                    {/* Botones de acción */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllAsRead}
                        >
                            Marcar todas como leídas
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setNotifications([])
                                toast.success("Todas las notificaciones eliminadas")
                            }}
                        >
                            Limpiar todo
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
