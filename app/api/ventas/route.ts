import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Sale from "@/lib/db/models/Sale"
import Product from "@/lib/db/models/Product"
import Company from "@/lib/db/models/Company"
import CashSession from "@/lib/db/models/CashSession"
import { withSessionContext } from "@/lib/api-wrapper"

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    // Lista para seguimiento de productos modificados para Rollback manual
    const modifiedProducts: { id: string, quantity: number, variantId?: string }[] = []
    
    try {
        await connectDB()
        const body = await req.json()
        const { items, total, paymentMethod, customer, amountPaid: amountPaidBody } = body

        if (!items || items.length === 0) {
            return NextResponse.json({ error: "El carrito está vacío" }, { status: 400 })
        }

        const amountPaid = Number(amountPaidBody) || 0
        const balance = Math.max(0, total - amountPaid)
        let paymentStatus: "paid" | "partial" | "pending" = "paid"
        
        if (amountPaid === 0) paymentStatus = "pending"
        else if (amountPaid < total) paymentStatus = "partial"

        // 1. Validar y descontar stock (con tracking para rollback)
        for (const item of items) {
            const product = await Product.findById(item.product._id)
            if (!product) {
                throw new Error(`Producto no encontrado: ${item.product.name}`)
            }

            if (item.variantId) {
                // Descontar de variante específica
                const variant = (product as any).variants.find((v: any) => v._id.toString() === item.variantId)
                if (!variant) throw new Error(`Variante no encontrada para: ${product.name}`)
                if (variant.stock < item.quantity) throw new Error(`Stock insuficiente para variante ${variant.name}`)
                
                variant.stock -= item.quantity
                product.markModified('variants')
                modifiedProducts.push({ id: product._id as any, quantity: item.quantity, variantId: item.variantId })
            } else {
                // Descontar de stock general
                if (product.stock < item.quantity) {
                    throw new Error(`Stock insuficiente para: ${product.name}`)
                }
                product.stock -= item.quantity
                modifiedProducts.push({ id: product._id as any, quantity: item.quantity })
            }
            
            await product.save()
        }

        // 2. Obtener siguiente número consecutivo
        const lastSale = await Sale.findOne({ companyId: context.companyId })
            .sort({ sequential: -1 })
            .select('sequential')
            .setOptions({ skipTenantFilter: true })

        const nextSequential = (lastSale?.sequential || 0) + 1
        const ticketNumber = `Venta #${nextSequential.toString().padStart(4, '0')}`

        // 3. Crear la Venta
        const sale = await Sale.create({
            customer: customer || null,
            items: items.map((i: any) => ({
                product: i.product._id,
                variantId: i.variantId || null,
                variantName: i.variantName || null,
                quantity: i.quantity,
                price: i.variantId ? i.variantPrice : i.product.salePrice,
                subtotal: (i.variantId ? i.variantPrice : i.product.salePrice) * i.quantity
            })),
            total,
            amountPaid,
            balance,
            paymentStatus,
            paymentMethod: paymentMethod || "cash",
            payments: amountPaid > 0 ? [{
                amount: amountPaid,
                date: new Date(),
                paymentMethod: paymentMethod || "cash"
            }] : [],
            companyId: context.companyId,
            ticketNumber,
            sequential: nextSequential
        })

        // 4. ACTUALIZAR SESIÓN DE CAJA (SI EXISTE)
        try {
            const activeSession = await CashSession.findOne({
                userId: context.userId,
                status: 'open'
            })

            if (activeSession) {
                activeSession.totalSales += total
                
                // Actualizar por método de pago
                if (paymentMethod === 'cash') activeSession.totalCashSales += total
                else if (paymentMethod === 'card') activeSession.totalCardSales += total
                else if (paymentMethod === 'transfer') activeSession.totalTransferSales += total
                
                await activeSession.save()
            }
        } catch (cajaErr) {
            console.error("Error updating cash session totals:", cajaErr)
            // No bloqueamos la venta por un error en arqueo
        }

        // 5. Actualizar contadores de uso del Plan
        try {
            await (Company as any).incrementUsage(context.companyId, 'sales')
        } catch (usageErr) {
            console.error("Error updating usage stats (Sales):", usageErr)
        }

        return NextResponse.json(sale, { status: 201 })

    } catch (error: any) {
        console.error("SALE PROCESSING FATAL ERROR:", error)
        
        // 🚨 ROLLBACK MANUAL DE STOCK (Soporta Variantes)
        if (modifiedProducts.length > 0) {
            console.log("Restaurando stock por fallo en transacción...")
            for (const mod of modifiedProducts) {
                if (mod.variantId) {
                    await Product.updateOne(
                        { _id: mod.id, "variants._id": mod.variantId },
                        { $inc: { "variants.$.stock": mod.quantity } }
                    )
                } else {
                    await Product.findByIdAndUpdate(mod.id, { $inc: { stock: mod.quantity } })
                }
            }
        }

        // Manejo de error de duplicidad de Ticket por concurrencia
        if (error.code === 11000) {
            return NextResponse.json({ 
                error: "Error de concurrencia en el ticket. Por favor intente de nuevo la venta." 
            }, { status: 409 })
        }

        return NextResponse.json({ error: error.message || "Error al procesar venta" }, { status: 500 })
    }
})

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const { searchParams } = new URL(req.url)
        const clientId = searchParams.get('clientId')

        let query: any = { companyId: context.companyId }
        if (clientId) {
            query.customer = clientId
        }

        console.log(`HISTORIAL: Buscando ventas para empresa: ${context.companyId}, cliente: ${clientId || 'todos'}`)

        let sales = await Sale.find(query)
            .populate('items.product', 'name sku')
            .populate('customer', 'name taxId')
            .sort({ createdAt: -1 })
            .lean()

        // 2. Si no hay nada, buscar globales (por si los IDs están mal)
        if (sales.length === 0) {
            console.log("HISTORIAL: No se hallaron ventas filtradas. Cargando todas para diagnóstico...")
            sales = await Sale.find({})
                .populate('items.product', 'name sku')
                .sort({ createdAt: -1 })
                .limit(50)
                .lean()
        }

        console.log(`HISTORIAL: Se cargaron ${sales.length} ventas`)
        return NextResponse.json({ sales }, { status: 200 })
    } catch (error: any) {
        console.error("Error fetching sales:", error)
        return NextResponse.json({ error: "Error al obtener historial de ventas" }, { status: 500 })
    }
})
