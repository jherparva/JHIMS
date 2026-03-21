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
        const body = await req.json()
        const { subject, message, priority = "medium" } = body

        if (!subject || !message) {
            return NextResponse.json(
                { error: "Asunto y mensaje son requeridos" },
                { status: 400 }
            )
        }

        const ticket = await Ticket.create({
            companyId: user.companyId,
            userId: user.id,
            subject,
            message,
            priority,
            status: "open"
        })

        return NextResponse.json({
            message: "Ticket creado exitosamente",
            ticket
        }, { status: 201 })

    } catch (error: any) {
        console.error("CREATE TICKET ERROR:", error)
        return NextResponse.json(
            { error: "Error al enviar mensaje de soporte" },
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

        // Los usuarios normales solo ven sus propios tickets de su empresa
        const tickets = await Ticket.find({ companyId: user.companyId })
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json(tickets)

    } catch (error: any) {
        console.error("GET TICKETS ERROR:", error)
        return NextResponse.json(
            { error: "Error al obtener tickets" },
            { status: 500 }
        )
    }
}
