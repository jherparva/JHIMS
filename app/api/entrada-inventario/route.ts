import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import StockIn from "@/lib/db/models/StockIn"
import Product from "@/lib/db/models/Product"
import Supplier from "@/lib/db/models/Supplier"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        // Obtener todas las entradas de stock de esta empresa, descendente
        const stockIns = await StockIn.find({ companyId: context.companyId })
            .populate('supplier', 'name')
            .populate('items.product', 'name sku')
            .sort({ date: -1 })
            .lean()

        return NextResponse.json({ stockIns }, { status: 200 })
    } catch (error: any) {
        console.error("Error fetching stock ins:", error)
        return NextResponse.json({ error: "Error al obtener historial de entradas" }, { status: 500 })
    }
})

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const body = await req.json()
        const { supplier, items, referenceNumber, notes } = body

        if (!supplier) {
            return NextResponse.json({ error: "El proveedor es requerido" }, { status: 400 })
        }

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "Debe agregar al menos un producto" }, { status: 400 })
        }

        // Calcular total y validar datos
        let total = 0
        const validItems = []

        for (const item of items) {
            if (!item.product || !item.quantity || !item.unitCost) {
                return NextResponse.json({ error: "Datos de producto incompletos" }, { status: 400 })
            }

            const product = await Product.findById(item.product)
            if (!product) {
                return NextResponse.json({ error: `Producto no encontrado` }, { status: 404 })
            }

            const subtotal = item.quantity * item.unitCost
            total += subtotal
            validItems.push({
                product: item.product,
                quantity: item.quantity,
                unitCost: item.unitCost,
                subtotal: subtotal
            })

            // Actualizar el stock del producto y opcionalmente el precio de compra
            product.stock += item.quantity
            product.purchasePrice = item.unitCost // Actualizar el último costo de compra

            // Establecer proveedor si no está definido
            if (!product.supplier) {
                product.supplier = supplier
            }

            await product.save()

            // REGISTRAR EN KARDEX
            const { default: Kardex } = await import("@/lib/db/models/Kardex")
            await Kardex.create({
                companyId: context.companyId,
                productId: product._id,
                type: "in",
                quantity: item.quantity,
                balanceAfter: product.stock,
                reason: "Entrada por Compra",
                referenceId: null, // Se asignará después si es necesario, o usar el referenceNumber
                referenceTicket: referenceNumber || "Entrada Manual",
                date: new Date()
            })
        }

        // Crear registro de Entrada de Stock
        const stockIn = await StockIn.create({
            supplier,
            items: validItems,
            total,
            referenceNumber,
            notes,
            companyId: context.companyId,
            date: new Date()
        })

        return NextResponse.json(stockIn, { status: 201 })
    } catch (error: any) {
        console.error("Error processing stock in:", error)
        return NextResponse.json({ error: error.message || "Error al registrar la entrada" }, { status: 500 })
    }
})
