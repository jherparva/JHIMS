import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { NotificationService } from "@/lib/servicios/NotificationService"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        const user = await getSession()
        if (!user || user.role !== 'admin' && user.role !== 'superadmin') {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        await connectDB()
        const body = await req.json()
        const { type, title, message, priority = "medium", data, targetUsers = [] } = body

        if (!type || !title || !message) {
            return NextResponse.json(
                { error: "Tipo, título y mensaje son requeridos" },
                { status: 400 }
            )
        }

        // Si es superadmin, puede enviar a usuarios específicos o a toda la empresa
        if (user.role === 'superadmin') {
            const { companyId, userIds } = body
            
            if (companyId && userIds && userIds.length > 0) {
                // Enviar a usuarios específicos de una empresa
                const User = require('@/lib/db/models/User').default
                
                for (const userId of userIds) {
                    await NotificationService.createNotification(userId, companyId, type, title, message, priority, data)
                }
                
                return NextResponse.json({
                    message: `Notificaciones enviadas a ${userIds.length} usuarios específicos`
                })
            } else if (companyId) {
                // Enviar a todos los usuarios de la empresa
                await NotificationService.createCompanyWideNotification(companyId, title, message, type, priority, data)
                
                return NextResponse.json({
                    message: "Notificación enviada a todos los usuarios de la empresa"
                })
            } else {
                return NextResponse.json({
                    error: "Para superadmin: companyId o userIds son requeridos"
                }, { status: 400 })
            }
        } else {
            // Admin normal solo puede enviar notificaciones a su propia empresa
            if (!user.companyId) {
                return NextResponse.json({ error: "Usuario no tiene empresa asignada" }, { status: 400 })
            }
            await NotificationService.createNotification(user.id, user.companyId, type, title, message, priority, data)
            
            return NextResponse.json({
                message: "Notificación creada exitosamente"
            })
        }

    } catch (error: any) {
        console.error("CREATE NOTIFICATION ERROR:", error)
        return NextResponse.json(
            { error: "Error al crear notificación" },
            { status: 500 }
        )
    }
}
