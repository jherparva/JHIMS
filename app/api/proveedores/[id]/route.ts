import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Supplier from "@/lib/db/models/Supplier"
import { withSessionContext } from "@/lib/api-wrapper"

export const PUT = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const body = await req.json()
        const { name, contactName, email, phone, address, taxId } = body

        const supplier = await Supplier.findByIdAndUpdate(
            params.id,
            { name, contactName, email, phone, address, taxId },
            { new: true, runValidators: true }
        )

        if (!supplier) {
            return NextResponse.json(
                { error: "Proveedor no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json(supplier)
    } catch (error: any) {
        console.error("Error updating supplier:", error)
        return NextResponse.json(
            { error: "Error al actualizar proveedor" },
            { status: 500 }
        )
    }
})

import Product from "@/lib/db/models/Product"

export const DELETE = withSessionContext(async (
    req: NextRequest,
    context: any // El context viene del wrapper
) => {
    // Manejo de params manual para evitar leaks de contexto en Vercel Edge con el wrapper
    const url = new URL(req.url);
    const id = url.pathname.split('/').pop();

    try {
        await connectDB()

        // 1. Verificar si existen productos asociados a este proveedor
        const productsCount = await Product.countDocuments({ supplier: id })

        if (productsCount > 0) {
            // Si tiene productos, NUNCA eliminamos físicamente. Solo desactivamos.
            const deactivatedSupplier = await Supplier.findByIdAndUpdate(
                id,
                { isActive: false },
                { new: true }
            )

            if (!deactivatedSupplier) {
                return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 })
            }

            return NextResponse.json({ 
                message: `El proveedor tiene ${productsCount} productos asociados. Se ha marcado como INACTIVO en lugar de borrarlo para proteger tu inventario.`,
                status: 'deactivated'
            })
        }

        // 2. Si NO tiene productos asociados, podemos proceder al borrado físico (Hard Delete)
        const supplier = await Supplier.findByIdAndDelete(id)

        if (!supplier) {
            return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 })
        }

        return NextResponse.json({ message: "Proveedor eliminado permanentemente" })
    } catch (error: any) {
        console.error("Error deleting supplier:", error)
        return NextResponse.json(
            { error: "Error al procesar la baja del proveedor" },
            { status: 500 }
        )
    }
})
