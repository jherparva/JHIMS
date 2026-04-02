import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import CashSession from "@/lib/db/models/CashSession"
import { withSessionContext } from "@/lib/api-wrapper"
import mongoose from "mongoose"

// GET: Consultar sesión activa
export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        
        // El plugin de multi-tenancia filtrará por la empresa actual del usuario
        // Además filtramos por el usuario que hace la petición
        const activeSession = await CashSession.findOne({
            userId: context.userId,
            status: 'open'
        })

        return NextResponse.json({ activeSession })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

// POST: Abrir una nueva caja
export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const body = await req.json()
        const { openingAmount } = body

        // 1. Verificar si ya hay una caja abierta (No se puede abrir dos a la vez por usuario)
        const existingSession = await CashSession.findOne({
            userId: context.userId,
            status: 'open'
        })

        if (existingSession) {
            return NextResponse.json({ error: "Ya tienes una sesión de caja abierta" }, { status: 400 })
        }

        // 2. Abrir caja
        const newSession = await CashSession.create({
            companyId: context.companyId,
            userId: context.userId,
            openingAmount: Number(openingAmount) || 0,
            status: 'open',
            openingDate: new Date()
        })

        return NextResponse.json(newSession, { status: 201 })
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})

// PUT: Cerrar caja (Arqueo)
export const PUT = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const body = await req.json()
        const { closingAmount, notes } = body

        // 1. Obtener sesión abierta
        const activeSession = await CashSession.findOne({
            userId: context.userId,
            status: 'open'
        })

        if (!activeSession) {
            return NextResponse.json({ error: "No hay sesión activa para cerrar" }, { status: 400 })
        }

        // 2. Calcular montos finales
        // El expectedAmount ya debería venir acumulado o lo calculamos aquí
        // Por simplicidad, el front puede enviar el total acumulado
        const expected = (activeSession.openingAmount + activeSession.totalCashSales)
        const diff = Number(closingAmount) - expected

        activeSession.closingAmount = Number(closingAmount)
        activeSession.expectedAmount = expected
        activeSession.difference = diff
        activeSession.status = 'closed'
        activeSession.closingDate = new Date()
        activeSession.notes = notes || ""

        await activeSession.save()

        return NextResponse.json(activeSession)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
})
