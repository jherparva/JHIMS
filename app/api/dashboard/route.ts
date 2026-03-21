import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Product from "@/lib/db/models/Product"
import Customer from "@/lib/db/models/Customer"
import { withSessionContext } from "@/lib/api-wrapper"
import Sale from "@/lib/db/models/Sale"
import mongoose from "mongoose"

export const dynamic = "force-dynamic"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        // 1. Validar companyId
        if (!context.companyId) {
            console.error("DASHBOARD: No companyId in context")
            return NextResponse.json({ error: "Falta companyId" }, { status: 400 })
        }

        const compId = new mongoose.Types.ObjectId(context.companyId)

        // 2. Conteo de documentos básicos (CORREGIDO: filtrar por empresa)
        const totalProducts = await Product.countDocuments({ companyId: compId, isActive: true })
        const totalCustomers = await Customer.countDocuments({ companyId: compId, isActive: true })

        // 3. Obtener estadísticas de ventas (CORREGIDO: solo de la empresa específica)
        const salesStats = await Sale.aggregate([
            { $match: { companyId: compId } },
            {
                $group: {
                    _id: null,
                    totalSales: { $sum: "$total" },
                    totalOrders: { $sum: 1 }
                }
            }
        ])

        // ELIMINADO: El fallback que buscaba todas las ventas (causaba data leak)

        const totalSales = salesStats[0]?.totalSales || 0
        const totalOrders = salesStats[0]?.totalOrders || 0

        // 4. Productos con stock bajo (CORREGIDO: filtrar por empresa)
        const lowStockProducts = await Product.find({
            companyId: compId,
            isActive: true,
            $expr: { $lte: ["$stock", "$minStock"] }
        })
            .select("name stock")
            .limit(5)
            .lean()

        // 5. Ventas recientes
        const recentSalesData = await Sale.find({ companyId: compId })
            .populate("customer", "name")
            .sort({ createdAt: -1 })
            .limit(5)
            .lean()

        const recentSales = recentSalesData.map(sale => ({
            id: (sale as any)._id.toString(),
            customer: (sale as any).customer ? (sale as any).customer.name : "Cliente Mostrador",
            total: (sale as any).total,
            date: new Date((sale as any).createdAt).toLocaleDateString()
        }))

        // 6. Gráfica de ventas (últimos 7 días)
        const sevenDaysAgo = new Date()
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
        sevenDaysAgo.setHours(0, 0, 0, 0)

        const chartAgg = await Sale.aggregate([
            {
                $match: {
                    companyId: compId,
                    createdAt: { $gte: sevenDaysAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                    totalSales: { $sum: "$total" }
                }
            },
            { $sort: { "_id": 1 } }
        ])

        const daysMap = new Map()
        for (let i = 0; i < 7; i++) {
            const d = new Date(sevenDaysAgo)
            d.setDate(d.getDate() + i)
            daysMap.set(d.toISOString().split('T')[0], 0)
        }
        
        chartAgg.forEach(item => {
            daysMap.set(item._id, item.totalSales)
        })

        const chartData = Array.from(daysMap, ([dateStr, total]) => {
             const d = new Date(dateStr + "T00:00:00")
             return {
                 name: d.toLocaleDateString('es-ES', { weekday: 'short' }),
                 value: total
             }
        })

        const midnight = new Date()
        midnight.setHours(0, 0, 0, 0)
        const todaySalesAgg = await Sale.aggregate([
            { $match: { companyId: compId, createdAt: { $gte: midnight } } },
            { $group: { _id: null, total: { $sum: "$total" } } }
        ])
        const todaySales = todaySalesAgg[0]?.total || 0

        const stats = {
            totalSales,
            todaySales,
            totalOrders,
            totalProducts,
            totalCustomers,
            recentSales,
            chartData,
            lowStockProducts: lowStockProducts.map(p => ({
                id: (p as any)._id.toString(),
                name: (p as any).name,
                stock: (p as any).stock
            }))
        }

        return NextResponse.json(stats)
    } catch (error: any) {
        console.error("DASHBOARD ERROR:", error)
        return NextResponse.json(
            { error: `Error en dashboard: ${error.message}` },
            { status: 500 }
        )
    }
})
