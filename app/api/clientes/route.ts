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
        
        // =============================================================================
        // 1. VALIDACIÓN CON ZOD
        // =============================================================================
        const { customerSchema } = await import("@/lib/validations/customer")
        const validation = customerSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json(
                { 
                    error: "Datos de cliente inválidos", 
                    details: validation.error.format() 
                },
                { status: 400 }
            )
        }

        const { name, email, phone, address, taxId } = validation.data

        const customer = await Customer.create({
            name,
            email,
            phone,
            address,
            taxId,
            companyId: context.companyId,
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
