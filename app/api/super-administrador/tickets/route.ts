import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Ticket from "@/lib/db/models/Ticket"
import { getSession } from "@/lib/auth"

async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") return null
    return user
}

export async function GET(req: NextRequest) {
    const admin = await verifySuperAdmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {
        await connectDB()

        // El superadmin ve todos los tickets de todas las empresas
        const tickets = await Ticket.find({})
            .populate("companyId", "name email")
            .populate("userId", "fullName username email")
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json(tickets)

    } catch (error: any) {
        console.error("SUPERADMIN GET TICKETS ERROR:", error)
        return NextResponse.json(
            { error: "Error al obtener tickets" },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    const admin = await verifySuperAdmin()
    if (!admin) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    try {
        await connectDB()
        const body = await req.json()
        const { ticketId, response } = body

        if (!ticketId || !response) {
            return NextResponse.json(
                { error: "ID del ticket y respuesta son requeridos" },
                { status: 400 }
            )
        }

        // Actualizar ticket con respuesta del superadmin
        const ticket = await Ticket.findByIdAndUpdate(
            ticketId,
            {
                response,
                status: "resolved",
                respondedAt: new Date()
            },
            { new: true }
        ).populate('userId', 'fullName username email')

        if (!ticket) {
            return NextResponse.json(
                { error: "Ticket no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json({
            message: "Respuesta enviada exitosamente",
            ticket
        })

    } catch (error: any) {
        console.error("SUPERADMIN RESPOND TICKET ERROR:", error)
        return NextResponse.json(
            { error: "Error al responder ticket" },
            { status: 500 }
        )
    }
}
