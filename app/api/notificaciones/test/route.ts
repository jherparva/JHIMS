import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { getSession } from "@/lib/auth"

export async function GET(req: NextRequest) {
    try {
        const user = await getSession()
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        await connectDB()

        // Devolver datos de prueba para verificar que el API funciona
        const testNotifications = [
            {
                _id: "test-1",
                type: "ticket_response",
                title: "🎫 Respuesta a tu ticket",
                message: "Esta es una notificación de prueba para verificar que el sistema esté funcionando.",
                read: false,
                priority: "medium",
                createdAt: new Date().toISOString(),
                data: {
                    ticketSubject: "Ticket de Prueba",
                    response: "Respuesta de prueba"
                }
            },
            {
                _id: "test-2",
                type: "low_stock",
                title: "⚠️ Stock Bajo",
                message: "El producto de prueba tiene stock bajo. Actual: 5 unidades, mínimo: 10 unidades.",
                read: false,
                priority: "high",
                createdAt: new Date(Date.now() - 3600000).toISOString(),
                data: {
                    productName: "Producto de Prueba",
                    currentStock: 5,
                    minStock: 10
                }
            },
            {
                _id: "test-3",
                type: "new_user",
                title: "👤 Nuevo Usuario",
                message: "Se ha creado un nuevo usuario en tu empresa: test@ejemplo.com",
                read: false,
                priority: "medium",
                createdAt: new Date(Date.now() - 7200000).toISOString(),
                data: {
                    newUserEmail: "test@ejemplo.com",
                    newUserRole: "seller"
                }
            }
        ]

        return NextResponse.json({
            message: "Notificaciones de prueba cargadas",
            notifications: testNotifications,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                companyId: user.companyId
            }
        })

    } catch (error: any) {
        console.error("TEST NOTIFICATIONS ERROR:", error)
        return NextResponse.json(
            { error: "Error al cargar notificaciones de prueba" },
            { status: 500 }
        )
    }
}
