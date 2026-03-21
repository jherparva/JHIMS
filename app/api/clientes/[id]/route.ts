import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Customer from "@/lib/db/models/Customer"
import { withSessionContext } from "@/lib/api-wrapper"

export const PUT = withSessionContext(async (
    req: NextRequest,
    context: any
) => {
    const { params } = context
    try {
        await connectDB()

        const body = await req.json()
        const { name, email, phone, address, taxId } = body

        const customer = await Customer.findByIdAndUpdate(
            params.id,
            { name, email, phone, address, taxId },
            { new: true, runValidators: true }
        )

        if (!customer) {
            return NextResponse.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json(customer)
    } catch (error: any) {
        console.error("Error updating customer:", error)
        return NextResponse.json(
            { error: "Error al actualizar cliente" },
            { status: 500 }
        )
    }
})

export const DELETE = withSessionContext(async (
    req: NextRequest,
    context: any
) => {
    const { params } = context
    try {
        await connectDB()

        if (context.role !== "admin" && context.role !== "superadmin") {
            return NextResponse.json({ error: "No tienes permiso para eliminar clientes" }, { status: 403 })
        }

        const customer = await Customer.findByIdAndDelete(params.id)

        if (!customer) {
            return NextResponse.json(
                { error: "Cliente no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json({ message: "Cliente eliminado" })
    } catch (error: any) {
        console.error("Error deleting customer:", error)
        return NextResponse.json(
            { error: "Error al eliminar cliente" },
            { status: 500 }
        )
    }
})
