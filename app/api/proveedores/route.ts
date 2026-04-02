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
        const { name, contactName, email, phone, address, taxId, companyId } = body

        if (!name) {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            )
        }

        // Si se provee companyId en el body, lo usamos (ej. superadmin o migraciones)
        // De lo contrario, usamos el de la sesión (context.companyId) obligatoriamente para 
        // evitar errores de validación de Mongoose que ocurren antes del hook del plugin.
        const supplierData: any = {
            name,
            contactName,
            email,
            phone,
            address,
            taxId,
            companyId: companyId || context.companyId
        }

        const supplier = await Supplier.create(supplierData)

        return NextResponse.json(supplier, { status: 201 })
    } catch (error: any) {
        console.error("FATAL: Error creating supplier:", {
            message: error.message,
            stack: error.stack,
            name: error.name,
            errors: error.errors
        })
        return NextResponse.json(
            { error: "Error al crear proveedor: " + (error.message || "Error desconocido") },
            { status: 500 }
        )
    }
})
