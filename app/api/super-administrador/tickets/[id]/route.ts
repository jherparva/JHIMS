import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Ticket from "@/lib/db/models/Ticket"
import { getSession } from "@/lib/auth"

async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") return null
    return user
}

export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const admin = await verifySuperAdmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {
        await connectDB()
        const body = await req.json()
        const { response, status = "resolved" } = body

        if (!response) {
            return NextResponse.json(
                { error: "La respuesta es requerida" },
                { status: 400 }
            )
        }

        const ticket = await Ticket.findByIdAndUpdate(
            params.id,
            {
                response,
                status,
                respondedAt: new Date()
            },
            { new: true }
        )

        if (!ticket) {
            return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 })
        }

        return NextResponse.json({
            message: "Respuesta enviada exitosamente",
            ticket
        })

    } catch (error: any) {
        console.error("SUPERADMIN REPLY TICKET ERROR:", error)
        return NextResponse.json(
            { error: "Error al responder el ticket" },
            { status: 500 }
        )
    }
}
