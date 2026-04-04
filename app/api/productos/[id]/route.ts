import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Product from "@/lib/db/models/Product"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const product = await Product.findById(params.id)
            .populate("category", "name")
            .populate("supplier", "name")
            .lean()

        if (!product) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json(product)
    } catch (error: any) {
        console.error("Error fetching product:", error)
        return NextResponse.json(
            { error: "Error al obtener producto" },
            { status: 500 }
        )
    }
})

export const PUT = withSessionContext(async (
    req: NextRequest,
    { params, companyId }: { params: { id: string }, companyId: string }
) => {
    try {
        await connectDB()

        const body = await req.json()
        
        // =============================================================================
        // 1. VALIDACIÓN CON ZOD
        // =============================================================================
        const { productSchema } = await import("@/lib/validations/product")
        const validation = productSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json(
                { 
                    error: "Datos de entrada inválidos", 
                    details: validation.error.format() 
                },
                { status: 400 }
            )
        }

        const { name, sku, categoryId, supplierId, costPrice, salePrice, stock, minStock, description, hasVariants, variants, imageUrl } = validation.data

        // Verificar SKU único (excepto el producto actual)
        if (sku) {
            const existingProduct = await Product.findOne({
                sku,
                _id: { $ne: params.id },
            })
            if (existingProduct) {
                return NextResponse.json(
                    { error: "El SKU ya existe" },
                    { status: 400 }
                )
            }
        }

        const oldProduct = await Product.findById(params.id)
        if (!oldProduct) {
            return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 })
        }

        const product = await Product.findByIdAndUpdate(
            params.id,
            {
                name,
                sku,
                category: categoryId || undefined,
                supplier: (supplierId === 'none' || !supplierId) ? null : supplierId,
                purchasePrice: costPrice || 0,
                salePrice,
                stock: stock || 0,
                minStock: minStock || 0,
                description,
                imageUrl: imageUrl || "",
                hasVariants: hasVariants || false,
                variants: variants || []
            },
            { new: true, runValidators: true }
        )

        // REGISTRAR EN KARDEX SI HUBO CAMBIO DE STOCK
        if (oldProduct.stock !== (stock || 0)) {
            const { default: Kardex } = await import("@/lib/db/models/Kardex")
            const diff = (stock || 0) - oldProduct.stock
            await Kardex.create({
                companyId: companyId as any,
                productId: product._id,
                type: diff > 0 ? "in" : "adjustment",
                quantity: diff,
                balanceAfter: stock || 0,
                reason: "Ajuste Manual / Ingreso Rápido",
                referenceTicket: "Manual",
                date: new Date()
            })
        }

        return NextResponse.json(product)
    } catch (error: any) {
        console.error("Error updating product:", error)
        return NextResponse.json(
            { 
                error: "Error al actualizar producto",
                message: error.message 
            },
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

        const product = await Product.findByIdAndDelete(params.id)

        if (!product) {
            return NextResponse.json(
                { error: "Producto no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json({ message: "Producto eliminado" })
    } catch (error: any) {
        console.error("Error deleting product:", error)
        return NextResponse.json(
            { error: "Error al eliminar producto" },
            { status: 500 }
        )
    }
})
