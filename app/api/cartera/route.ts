import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Sale from "@/lib/db/models/Sale"
import CashSession from "@/lib/db/models/CashSession"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        
        // Buscar ventas que tengan saldo pendiente (fiados)
        const debts = await Sale.find({ 
            companyId: context.companyId,
            balance: { $gt: 0 },
            status: "completed"
        })
        .populate('customer', 'name phone docId taxId')
        .sort({ date: -1 })
        .lean()

        // Agrupar por cliente
        const carteraPorCliente: Record<string, any> = {}

        debts.forEach((sale: any) => {
            const customerId = sale.customer?._id?.toString() || "Desconocido"
            if (!carteraPorCliente[customerId]) {
                carteraPorCliente[customerId] = {
                    customer: sale.customer || { name: "Cliente no registrado" },
                    totalDebt: 0,
                    sales: []
                }
            }
            carteraPorCliente[customerId].totalDebt += sale.balance
            carteraPorCliente[customerId].sales.push(sale)
        })

        return NextResponse.json({ 
            cartera: Object.values(carteraPorCliente)
        }, { status: 200 })

    } catch (error: any) {
        console.error("Error fetching cartera:", error)
        return NextResponse.json({ error: "Error al obtener cartera" }, { status: 500 })
    }
})

// ABONAR A LA DEUDA
export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const { saleId, amount, paymentMethod } = await req.json()

        if (!saleId || !amount || amount <= 0) {
            return NextResponse.json({ error: "Datos de abono inválidos" }, { status: 400 })
        }

        // 1. Validar que haya una caja abierta para registrar el ingreso
        const activeSession = await CashSession.findOne({
            companyId: context.companyId,
            userId: context.userId,
            status: 'open'
        })

        if (!activeSession) {
            return NextResponse.json({ error: "Debes tener una caja abierta para recibir abonos" }, { status: 400 })
        }

        const sale = await Sale.findOne({ _id: saleId, companyId: context.companyId })
        if (!sale) return NextResponse.json({ error: "Venta no encontrada" }, { status: 404 })

        if (sale.balance < amount) {
            return NextResponse.json({ error: `El abono ($${amount}) supera la deuda ($${sale.balance})` }, { status: 400 })
        }

        // 2. Aplicar el abono
        sale.balance -= amount
        sale.amountPaid += amount
        if (sale.balance === 0) {
            sale.paymentStatus = "paid"
        } else {
            sale.paymentStatus = "partial"
        }

        sale.payments.push({
            amount,
            date: new Date(),
            paymentMethod: paymentMethod || "cash"
        })

        await sale.save()

        // 3. Actualizar el saldo de la caja actual
        if ((paymentMethod || 'cash') === 'cash') activeSession.totalCashSales += amount
        else if (paymentMethod === 'card') activeSession.totalCardSales += amount
        else if (paymentMethod === 'transfer') activeSession.totalTransferSales += amount
        
        await activeSession.save()

        return NextResponse.json({ success: true, balance: sale.balance }, { status: 200 })

    } catch (error: any) {
        console.error("Error adding payment:", error)
        return NextResponse.json({ error: "Error al registrar el abono" }, { status: 500 })
    }
})
