import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Category from "@/lib/db/models/Category"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const categories = await Category.find({ isActive: true })
            .sort({ name: 1 })
            .lean()

        return NextResponse.json({ categories })
    } catch (error: any) {
        console.error("Error fetching categories:", error)
        return NextResponse.json(
            { error: "Error al obtener categorías" },
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
        const { categorySchema } = await import("@/lib/validations/category")
        const validation = categorySchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json(
                { 
                    error: "Datos de categoría inválidos", 
                    details: validation.error.format() 
                },
                { status: 400 }
            )
        }

        const { name, description } = validation.data

        const category = await Category.create({
            name,
            description: description || "",
            companyId: context.companyId, // <--- REQUERIDO
        })

        return NextResponse.json(category, { status: 201 })
    } catch (error: any) {
        console.error("Error creating category:", error)

        if (error.code === 11000) {
            return NextResponse.json(
                { error: "La categoría ya existe" },
                { status: 400 }
            )
        }

        return NextResponse.json(
            { error: "Error al crear categoría" },
            { status: 500 }
        )
    }
})
