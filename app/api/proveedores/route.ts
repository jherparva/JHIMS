import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Supplier from "@/lib/db/models/Supplier"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const suppliers = await Supplier.find({ isActive: true })
            .sort({ name: 1 })
            .lean()

        return NextResponse.json(suppliers)
    } catch (error: any) {
        console.error("Error fetching suppliers:", error)
        return NextResponse.json(
            { error: "Error al obtener proveedores" },
            { status: 500 }
        )
    }
})

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const body = await req.json()
        const { name, contactName, email, phone, address, taxId } = body

        if (!name) {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            )
        }

        const supplier = await Supplier.create({
            name,
            contactName,
            email,
            phone,
            address,
            taxId,
        })

        return NextResponse.json(supplier, { status: 201 })
    } catch (error: any) {
        console.error("Error creating supplier:", error)
        return NextResponse.json(
            { error: "Error al crear proveedor" },
            { status: 500 }
        )
    }
})
