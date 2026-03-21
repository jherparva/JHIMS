import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Customer from "@/lib/db/models/Customer"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const customers = await Customer.find({ isActive: true })
            .sort({ name: 1 })
            .lean()

        return NextResponse.json(customers)
    } catch (error: any) {
        console.error("Error fetching customers:", error)
        return NextResponse.json(
            { error: "Error al obtener clientes" },
            { status: 500 }
        )
    }
})

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const body = await req.json()
        const { name, email, phone, address, taxId } = body

        if (!name) {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            )
        }

        const customer = await Customer.create({
            name,
            email,
            phone,
            address,
            taxId,
        })

        return NextResponse.json(customer, { status: 201 })
    } catch (error: any) {
        console.error("Error creating customer:", error)
        return NextResponse.json(
            { error: "Error al crear cliente" },
            { status: 500 }
        )
    }
})
