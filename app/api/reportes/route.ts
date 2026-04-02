import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Sale from "@/lib/db/models/Sale"
import StockIn from "@/lib/db/models/StockIn"
import Product from "@/lib/db/models/Product"
import { withSessionContext } from "@/lib/api-wrapper"
import mongoose from "mongoose"

export const dynamic = "force-dynamic"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        if (!context.companyId) {
            console.error("REPORTS: No companyId in context")
            return NextResponse.json({ error: "Falta context.companyId" }, { status: 400 })
        }

        const compId = new mongoose.Types.ObjectId(context.companyId)
        console.log(`REPORTS: Generando reporte para empresa ${context.companyId}`)

        const { searchParams } = new URL(req.url)
        const fromParam = searchParams.get('from')
        const toParam = searchParams.get('to')

        const startDate = fromParam ? new Date(fromParam) : new Date(new Date().setDate(new Date().getDate() - 7))
        const endDate = toParam ? new Date(toParam) : new Date()
        endDate.setHours(23, 59, 59, 999)

        console.log(`REPORTS: Rango ${startDate.toISOString()} - ${endDate.toISOString()}`)

        // 1. Ventas por categoría (Ajustado TZ)
        const salesByCategory = await Sale.aggregate([
            { 
                $match: { 
                    $or: [{ companyId: compId }, { companyId: context.companyId }],
                    createdAt: { $gte: startDate, $lte: endDate } 
                } 
            },
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.product",
                    foreignField: "_id",
                    as: "productInfo"
                }
            },
            { $unwind: "$productInfo" },
            {
                $lookup: {
                    from: "categories",
                    localField: "productInfo.category",
                    foreignField: "_id",
                    as: "categoryInfo"
                }
            },
            { $unwind: "$categoryInfo" },
            {
                $group: {
                    _id: "$categoryInfo.name",
                    value: { $sum: "$items.quantity" }
                }
            },
            { $project: { name: "$_id", value: 1, _id: 0 } }
        ])

        // 2. Ingresos Diarios (Ajustado TZ Colombia)
        const moneyInByDay = await Sale.aggregate([
            { 
                $match: { 
                    $or: [{ companyId: compId }, { companyId: context.companyId }],
                    createdAt: { $gte: startDate, $lte: endDate } 
                } 
            },
            {
                $project: {
                    // Ajustamos la fecha a Colombia (-5 horas) para que coincida con el calendario local
                    date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "-05:00" } },
                    monto: { $cond: [ { $gt: ["$amountPaid", 0] }, "$amountPaid", "$total" ] }
                }
            },
            {
                $group: {
                    _id: "$date",
                    total: { $sum: "$monto" }
                }
            }
        ])

        // 3. Compras Diarias (Ajustado TZ Colombia)
        const purchasesByDay = await StockIn.aggregate([
            { 
                $match: { 
                    $or: [{ companyId: compId }, { companyId: context.companyId }],
                    createdAt: { $gte: startDate, $lte: endDate } 
                } 
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "-05:00" } },
                    total: { $sum: "$total" }
                }
            }
        ])

        // Mezclar datos diarios basándose en el rango solicitado
        const dailySummary = []
        
        // Iteramos día por día usando la hora local para evitar saltos de fecha
        let curr = new Date(startDate.getTime() + (startDate.getTimezoneOffset() * 60000));
        
        // Ajuste para asegurar que trabajamos con el inicio del día local
        curr.setHours(0, 0, 0, 0);
        
        while (curr <= endDate) {
            // Formato YYYY-MM-DD local
            const dateStr = curr.toISOString().split('T')[0];
            const dayName = curr.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' });

            const moneyIn = moneyInByDay.find(s => s._id === dateStr);
            const purchase = purchasesByDay.find(p => p._id === dateStr);

            dailySummary.push({
                name: dayName,
                fullDate: curr.toLocaleDateString('es-CO'), // Fecha legible en el Excel
                ventas: Number(moneyIn?.total || 0),
                compras: Number(purchase?.total || 0)
            });
            
            curr.setDate(curr.getDate() + 1);
        }

        // 4. Productos Top
        const topProducts = await Sale.aggregate([
            { 
                $match: { 
                    $or: [{ companyId: compId }, { companyId: context.companyId }],
                    createdAt: { $gte: startDate, $lte: endDate } 
                } 
            },
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.product",
                    sold: { $sum: "$items.quantity" }
                }
            },
            {
                $lookup: {
                    from: "products",
                    localField: "_id",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            { $sort: { sold: -1 } },
            { $limit: 10 },
            {
                $project: {
                    name: "$product.name",
                    sold: 1,
                    _id: 0
                }
            }
        ])
        console.log(`REPORTS: Productos top cargados: ${topProducts.length}`)

        // 5. Ventas por Vendedor (Ranking de Rendimiento)
        const salesByVendor = await Sale.aggregate([
            {
                $match: {
                    $or: [{ companyId: compId }, { companyId: context.companyId }],
                    createdAt: { $gte: startDate, $lte: endDate }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "seller",
                    foreignField: "_id",
                    as: "sellerInfo"
                }
            },
            { $unwind: "$sellerInfo" },
            {
                $group: {
                    _id: "$sellerInfo.fullName",
                    total: { $sum: "$total" },
                    count: { $sum: 1 }
                }
            },
            { $project: { name: "$_id", total: 1, count: 1, _id: 0 } },
            { $sort: { total: -1 } }
        ])

        // 6. Transacciones Individuales (El Detalle Máximo)
        const rawSales = await Sale.find({
            $or: [{ companyId: compId }, { companyId: context.companyId }],
            createdAt: { $gte: startDate, $lte: endDate }
        })
        .populate('customer', 'name taxId')
        .populate('seller', 'fullName')
        .sort({ createdAt: -1 })
        .lean()

        const rawPurchases = await StockIn.find({
            $or: [{ companyId: compId }, { companyId: context.companyId }],
            createdAt: { $gte: startDate, $lte: endDate }
        })
        .populate('supplier', 'name')
        .sort({ createdAt: -1 })
        .lean()

        // 6. Datos de la Empresa para el Encabezado
        const company = await mongoose.model("Company").findById(compId).select("name taxId").lean();

        const responseData = {
            salesByCategory: salesByCategory.length > 0 ? salesByCategory : [{ name: 'Sin Ventas', value: 1 }],
            dailySummary,
            topProducts,
            salesByVendor: salesByVendor || [],
            rawSales: rawSales || [],
            rawPurchases: rawPurchases || [],
            company: company || { name: "JHIMS Usuario", taxId: "N/A" }
        }

        return NextResponse.json(responseData)
    } catch (error: any) {
        console.error("REPORTS ERROR:", error)
        return NextResponse.json({ error: "Error al generar reportes" }, { status: 500 })
    }
})
