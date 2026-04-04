import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Sale from "@/lib/db/models/Sale"
import Product from "@/lib/db/models/Product"
import Kardex from "@/lib/db/models/Kardex"
import CashSession from "@/lib/db/models/CashSession"
import { withSessionContext } from "@/lib/api-wrapper"

// RESTAURAR VENTA ANULADA (UNDO CANCEL)
export const POST = withSessionContext(async (req: NextRequest, { params, companyId }: { params: { id: string }, companyId: string }) => {
    try {
        await connectDB()
        const saleId = params.id

        const sale = await Sale.findOne({ _id: saleId, companyId })
        if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })

        if (sale.status !== "cancelled") {
            return NextResponse.json({ error: "Esta venta no está anulada" }, { status: 400 })
        }

        // 1. Validar Stock Suficiente para reactivar
        for (const item of sale.items) {
            const product = await Product.findOne({ _id: item.product, companyId })
            if (!product) throw new Error(`Producto ${item.product} no encontrado`)

            if (item.variantId) {
                const variant = (product as any).variants.find((v: any) => v._id.toString() === item.variantId)
                if (!variant) throw new Error(`Variante no encontrada para ${product.name}`)
                if (variant.stock < item.quantity) throw new Error(`Stock insuficiente para reactivar (${product.name} ${variant.name})`)
            } else {
                if (product.stock < item.quantity) {
                    throw new Error(`Stock insuficiente para reactivar: ${product.name}`)
                }
            }
        }

        // 2. Descontar Stock y Registrar Kardex
        for (const item of sale.items) {
            const product = await Product.findOne({ _id: item.product, companyId })
            if (!product) continue

            if (item.variantId) {
                const variantIndex = (product as any).variants.findIndex((v: any) => v._id.toString() === item.variantId)
                product.variants[variantIndex].stock -= item.quantity
                product.markModified('variants')
            } else {
                product.stock -= item.quantity
            }
            await product.save()

            // Registrar en Kardex (Salida por reactivación)
            await Kardex.create({
                companyId,
                productId: product._id,
                variantId: item.variantId,
                type: "out",
                quantity: -item.quantity,
                balanceAfter: item.variantId 
                    ? (product as any).variants.find((v: any) => v._id.toString() === item.variantId)?.stock || 0
                    : product.stock,
                reason: "Reactivación de Venta Anulada",
                referenceId: sale._id,
                referenceTicket: sale.ticketNumber,
                date: new Date()
            })
        }

        // 3. Restaurar en Caja (Si hay sesión abierta)
        const activeSession = await CashSession.findOne({
            userId: sale.seller,
            companyId: companyId,
            status: 'open'
        })

        if (activeSession) {
            activeSession.totalSales += sale.total
            if (sale.paymentMethod === 'cash' || sale.paymentMethod === 'credit') {
                activeSession.totalCashSales += sale.amountPaid || 0
            } else if (sale.paymentMethod === 'card') {
                activeSession.totalCardSales += sale.amountPaid || 0
            } else if (sale.paymentMethod === 'transfer') {
                activeSession.totalTransferSales += sale.amountPaid || 0
            }
            await activeSession.save()
        }

        // 4. Cambiar estado a COMPLETADO
        sale.status = "completed"
        await sale.save()

        return NextResponse.json({ message: "Venta restaurada exitosamente" })

    } catch (error: any) {
        console.error("RESTORE SALE ERROR:", error)
        return NextResponse.json({ error: error.message || "Error al restaurar venta" }, { status: 500 })
    }
})
