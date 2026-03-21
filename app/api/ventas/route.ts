import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Sale from "@/lib/db/models/Sale"
import Product from "@/lib/db/models/Product"
import { withSessionContext } from "@/lib/api-wrapper"

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
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

        // 1. Validate and descrease stock
        // ... (stock validation remains same)
        for (const item of items) {
            const product = await Product.findById(item.product._id)
            if (!product) {
                return NextResponse.json({ error: `Producto no encontrado: ${item.product.name}` }, { status: 404 })
            }
            if (product.stock < item.quantity) {
                return NextResponse.json({ error: `Stock insuficiente para: ${product.name}` }, { status: 400 })
            }
            product.stock -= item.quantity
            await product.save()
        }

        // 2. Obtener siguiente número consecutivo
        const lastSale = await Sale.findOne({ companyId: context.companyId })
            .sort({ sequential: -1 })
            .select('sequential')

        const nextSequential = (lastSale?.sequential || 0) + 1
        const ticketNumber = `Venta #${nextSequential.toString().padStart(4, '0')}`

        // 3. Create Sale
        const sale = await Sale.create({
            customer: customer || null,
            items: items.map((i: any) => ({
                product: i.product._id,
                quantity: i.quantity,
                price: i.product.salePrice,
                subtotal: i.product.salePrice * i.quantity
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

        return NextResponse.json(sale, { status: 201 })
    } catch (error: any) {
        console.error("Error processing sale:", error)
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
