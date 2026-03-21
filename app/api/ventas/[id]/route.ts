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
