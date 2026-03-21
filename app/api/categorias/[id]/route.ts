import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Category from "@/lib/db/models/Category"
import Product from "@/lib/db/models/Product"
import { withSessionContext } from "@/lib/api-wrapper"

export const PUT = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const body = await req.json()
        const { name, description } = body

        const category = await Category.findByIdAndUpdate(
            params.id,
            { name, description },
            { new: true, runValidators: true }
        )

        if (!category) {
            return NextResponse.json(
                { error: "Categoría no encontrada" },
                { status: 404 }
            )
        }

        return NextResponse.json(category)
    } catch (error: any) {
        console.error("Error updating category:", error)
        return NextResponse.json(
            { error: "Error al actualizar categoría" },
            { status: 500 }
        )
    }
})

export const DELETE = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const category = await Category.findByIdAndDelete(params.id)

        if (!category) {
            return NextResponse.json(
                { error: "Categoría no encontrada" },
                { status: 404 }
            )
        }

        return NextResponse.json({ message: "Categoría eliminada" })
    } catch (error: any) {
        console.error("Error deleting category:", error)
        return NextResponse.json(
            { error: "Error al eliminar categoría" },
            { status: 500 }
        )
    }
})
