import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Sale from "@/lib/db/models/Sale"
import { withSessionContext } from "@/lib/api-wrapper"

export const PATCH = withSessionContext(async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
        await connectDB()
        const { amount } = await req.json()
        const saleId = params.id

        if (!amount || amount <= 0) {
            return NextResponse.json({ error: "Monto inválido" }, { status: 400 })
        }

        const sale = await Sale.findById(saleId)
        if (!sale) {
            return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })
        }

        // Calcular saldo real por seguridad (Total - lo que ya se pagó)
        const currentBalance = sale.total - (sale.amountPaid || 0)

        if (amount > currentBalance + 0.1) { // +0.1 por posibles decimales
            return NextResponse.json({ 
                error: `El monto ($${amount}) supera el saldo pendiente ($${currentBalance})`,
                details: { total: sale.total, alreadyPaid: sale.amountPaid, balance: currentBalance }
            }, { status: 400 })
        }

        // Update sale
        sale.amountPaid = (sale.amountPaid || 0) + Number(amount)
        sale.balance = Math.max(0, sale.total - sale.amountPaid)
        
        if (sale.balance <= 0) {
            sale.balance = 0
            sale.paymentStatus = "paid"
        } else {
            sale.paymentStatus = "partial"
        }

        // Add payment to history
        sale.payments.push({
            amount: Number(amount),
            date: new Date(),
            paymentMethod: "cash" // Default for manual deudas/abonos
        })

        await sale.save()

        return NextResponse.json(sale)
    } catch (error: any) {
        console.error("Error updating sale payment:", error)
        return NextResponse.json({ error: "Error al registrar el pago" }, { status: 500 })
    }
})

export const DELETE = withSessionContext(async (req: NextRequest, { params }: { params: { id: string } }) => {
    try {
        await connectDB()
        const saleId = params.id
        const { companyId } = (req as any).session || {}

        const Sale = (await import("@/lib/db/models/Sale")).default
        const Product = (await import("@/lib/db/models/Product")).default

        const sale = await Sale.findOne({ _id: saleId, companyId })
        if (!sale) {
            return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })
        }

        if (sale.status === "cancelled") {
            return NextResponse.json({ error: "Esta venta ya ha sido cancelada" }, { status: 400 })
        }

        // Restaurar Stock
        for (const item of sale.items) {
            const product = await Product.findOne({ _id: item.product, companyId })
            if (!product) continue

            if (item.variantId) {
                // Producto con variantes
                const variantIndex = product.variants.findIndex((v: any) => v._id.toString() === item.variantId)
                if (variantIndex !== -1) {
                    product.variants[variantIndex].stock += item.quantity
                }
            } else {
                // Producto simple
                product.stock += item.quantity
            }
            await product.save()
        }

        // Marcar como cancelada
        sale.status = "cancelled"
        await sale.save()

        // ACTUALIZAR SESIÓN DE CAJA (SI EXISTE UNA ABIERTA PARA EL VENDEDOR)
        try {
            const CashSession = (await import("@/lib/db/models/CashSession")).default
            const activeSession = await CashSession.findOne({
                userId: sale.seller,
                companyId: companyId,
                status: 'open'
            })

            if (activeSession) {
                activeSession.totalSales -= sale.total
                
                // Revertir por método de pago
                if (sale.paymentMethod === 'cash') activeSession.totalCashSales -= sale.total
                else if (sale.paymentMethod === 'card') activeSession.totalCardSales -= sale.total
                else if (sale.paymentMethod === 'transfer') activeSession.totalTransferSales -= sale.total
                
                await activeSession.save()
            }
        } catch (cajaErr) {
            console.error("Error updating cash session totals during cancellation:", cajaErr)
        }

        return NextResponse.json({ message: "Venta cancelada y stock restaurado exitosamente" })
    } catch (error: any) {
        console.error("DELETE SALE ERROR:", error)
        return NextResponse.json({ error: `Error al cancelar venta: ${error.message}` }, { status: 500 })
    }
})
