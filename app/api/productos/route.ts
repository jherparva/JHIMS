import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Product from "@/lib/db/models/Product"
import Category from "@/lib/db/models/Category"
import Supplier from "@/lib/db/models/Supplier"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const search = searchParams.get("search") || ""

        let query: any = {}

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { sku: { $regex: search, $options: "i" } },
            ]
        }

        const products = await Product.find(query)
            .populate("category", "name") // Corregido de categoryId a category
            .populate("supplier", "name") // Corregido de supplierId a supplier
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json({ products })
    } catch (error: any) {
        console.error("Error fetching products:", error)
        return NextResponse.json(
            { error: "Error al obtener productos" },
            { status: 500 }
        )
    }
})

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const body = await req.json()
        console.log("POST /api/products received body:", body)
        const { name, sku, categoryId, supplierId, costPrice, salePrice, stock, minStock, description } = body

        // Validaciones
        if (!name || !sku || !salePrice) {
            return NextResponse.json(
                { error: "Nombre, SKU y precio de venta son requeridos" },
                { status: 400 }
            )
        }

        // Verificar SKU único por compañía
        const existingProduct = await Product.findOne({ sku })
        if (existingProduct) {
            return NextResponse.json(
                { error: "El SKU ya existe" },
                { status: 400 }
            )
        }

        const product = await Product.create({
            name,
            sku,
            category: categoryId, // Mapeado de categoryId a category
            supplier: supplierId || null,
            purchasePrice: costPrice || 0, // Mapeado de costPrice a purchasePrice
            salePrice,
            stock: stock || 0,
            minStock: minStock || 0,
            description: description || "",
            imageUrl: body.imageUrl || body.image || "",
        })

        return NextResponse.json(product, { status: 201 })
    } catch (error: any) {
        console.error("Error creating product:", error)
        return NextResponse.json(
            { error: "Error al crear producto" },
            { status: 500 }
        )
    }
})
