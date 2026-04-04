import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Expense from "@/lib/db/models/Expense"
import CashSession from "@/lib/db/models/CashSession"
import { withSessionContext } from "@/lib/api-wrapper"
import { z } from "zod"

const createExpenseSchema = z.object({
    description: z.string().min(1, "La descripción es requerida").max(100),
    amount: z.number().positive("El monto debe ser positivo"),
    category: z.enum(['Servicios', 'Nómina', 'Insumos', 'Transporte', 'Mantenimiento', 'Otros']).default('Otros'),
    reference: z.string().optional(),
    notes: z.string().optional()
})

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const body = await req.json()
        
        const validation = createExpenseSchema.safeParse(body)
        if (!validation.success) {
            return NextResponse.json(
                { error: "Datos de gasto inválidos", details: validation.error.format() },
                { status: 400 }
            )
        }

        const { description, amount, category, reference, notes } = validation.data

        // 1. Validar que haya una caja abierta
        const activeSession = await CashSession.findOne({
            companyId: context.companyId,
            userId: context.userId,
            status: 'open'
        })

        if (!activeSession) {
            return NextResponse.json({ error: "Debes tener una caja abierta para registrar un gasto" }, { status: 400 })
        }

        // 2. Crear el Gasto
        const expense = await Expense.create({
            companyId: context.companyId,
            createdBy: context.userId,
            description,
            amount,
            category,
            reference,
            notes
        })

        // 3. Actualizar la caja (sumar a los gastos totales)
        activeSession.totalExpenses += amount
        await activeSession.save()

        return NextResponse.json(expense, { status: 201 })
    } catch (error: any) {
        console.error("Error creating expense:", error)
        return NextResponse.json({ error: "Error al registrar gasto" }, { status: 500 })
    }
})

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const expenses = await Expense.find({ companyId: context.companyId })
            .populate('createdBy', 'name')
            .sort({ date: -1 })
            .limit(100)
            .lean()
            
        return NextResponse.json({ expenses }, { status: 200 })
    } catch (error: any) {
        console.error("Error fetching expenses:", error)
        return NextResponse.json({ error: "Error al obtener gastos" }, { status: 500 })
    }
})
