import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Ticket from "@/lib/db/models/Ticket"
import { getSession } from "@/lib/auth"

export async function POST(req: NextRequest) {
    try {
        const user = await getSession()
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        await connectDB()

        // Marcar todos los tickets del usuario como leídos
        await Ticket.updateMany(
            { 
                userId: user.id,
                response: { $exists: true }, // Solo marcar los que tienen respuesta
                read: false // Solo los que no han sido leídos
            },
            { 
                read: true,
                updatedAt: new Date()
            }
        )

        return NextResponse.json({
            message: "Todos los tickets marcados como leídos"
        })

    } catch (error: any) {
        console.error("MARK TICKETS READ ERROR:", error)
        return NextResponse.json(
            { error: "Error al marcar tickets como leídos" },
            { status: 500 }
        )
    }
}
