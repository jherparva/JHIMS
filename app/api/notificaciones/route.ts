import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Notification from "@/lib/db/models/Notification"
import { getSession } from "@/lib/auth"

// Función para crear notificaciones
export async function POST(req: NextRequest) {
    try {
        const user = await getSession()
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        await connectDB()
        const body = await req.json()
        const { type, title, message, priority = "medium", data } = body

        if (!type || !title || !message) {
            return NextResponse.json(
                { error: "Tipo, título y mensaje son requeridos" },
                { status: 400 }
            )
        }

        const notification = await Notification.create({
            userId: user.id,
            companyId: user.companyId,
            type,
            title,
            message,
            priority,
            data: data || {}
        })

        return NextResponse.json({
            message: "Notificación creada exitosamente",
            notification
        }, { status: 201 })

    } catch (error: any) {
        console.error("CREATE NOTIFICATION ERROR:", error)
        return NextResponse.json(
            { error: "Error al crear notificación" },
            { status: 500 }
        )
    }
}

export async function GET(req: NextRequest) {
    try {
        const user = await getSession()
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        await connectDB()

        // Obtener notificaciones no leídas del usuario
        const notifications = await Notification.find({ 
            userId: user.id,
            read: false 
        })
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json(notifications)

    } catch (error: any) {
        console.error("GET NOTIFICATIONS ERROR:", error)
        return NextResponse.json(
            { error: "Error al obtener notificaciones" },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = await getSession()
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        await connectDB()
        const body = await req.json()
        const { notificationIds } = body

        if (!notificationIds || !Array.isArray(notificationIds)) {
            return NextResponse.json(
                { error: "IDs de notificaciones son requeridos" },
                { status: 400 }
            )
        }

        // Marcar notificaciones como leídas
        await Notification.updateMany(
            { 
                _id: { $in: notificationIds },
                userId: user.id 
            },
            { 
                read: true,
                updatedAt: new Date()
            }
        )

        return NextResponse.json({
            message: "Notificaciones marcadas como leídas"
        })

    } catch (error: any) {
        console.error("MARK NOTIFICATIONS READ ERROR:", error)
        return NextResponse.json(
            { error: "Error al marcar notificaciones" },
            { status: 500 }
        )
    }
}
