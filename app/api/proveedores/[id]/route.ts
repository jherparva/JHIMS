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

export const DELETE = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const supplier = await Supplier.findByIdAndDelete(params.id)

        if (!supplier) {
            return NextResponse.json(
                { error: "Proveedor no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json({ message: "Proveedor eliminado" })
    } catch (error: any) {
        console.error("Error deleting supplier:", error)
        return NextResponse.json(
            { error: "Error al eliminar proveedor" },
            { status: 500 }
        )
    }
})
