// =============================================================================
// API PRODUCTOS - JHIMS Inventory
// =============================================================================
// Gestión CRUD de productos con búsqueda y relaciones
// =============================================================================
import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Product from "@/lib/db/models/Product"
import Category from "@/lib/db/models/Category"
import Supplier from "@/lib/db/models/Supplier"
import Company from "@/lib/db/models/Company"
import { withSessionContext } from "@/lib/api-wrapper"

// =============================================================================
// GET /api/productos - LISTAR PRODUCTOS
// =============================================================================
// Parámetro: search (opcional) - Busca por nombre o SKU
// Retorna: Lista de productos con categoría y proveedor
export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const search = searchParams.get("search") || ""

        // Construir consulta de búsqueda
        let query: any = {}

        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },  // Búsqueda en nombre
                { sku: { $regex: search, $options: "i" } },   // Búsqueda en SKU
            ]
        }

        // Ejecutar consulta con relaciones
        const products = await Product.find(query)
            .populate("category", "name")    // Categoría (solo nombre)
            .populate("supplier", "name")    // Proveedor (solo nombre)
            .sort({ createdAt: -1 })          // Más recientes primero
            .lean()                          // Objetos planos

        return NextResponse.json({ products })
    } catch (error: any) {
        console.error("Error fetching products:", error)
        return NextResponse.json(
            { error: "Error al obtener productos" },
            { status: 500 }
        )
    }
})

// =============================================================================
// POST /api/productos - CREAR PRODUCTO
// =============================================================================
// Recibe: Datos completos del producto
// Retorna: Producto creado con ID
export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const body = await req.json()
        
        // =============================================================================
        // 1. VALIDACIÓN CON ZOD
        // =============================================================================
        const { productSchema } = await import("@/lib/validations/product")
        const validation = productSchema.safeParse(body)
        
        if (!validation.success) {
            return NextResponse.json(
                { 
                    error: "Datos de entrada inválidos", 
                    details: validation.error.format() 
                },
                { status: 400 }
            )
        }

        const { name, sku, categoryId, supplierId, costPrice, salePrice, stock, minStock, description } = validation.data

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
            supplier: supplierId === 'none' ? null : supplierId,
            purchasePrice: costPrice || 0, // Mapeado de costPrice a purchasePrice
            salePrice,
            stock: stock || 0,
            minStock: minStock || 0,
            description: description || "",
            imageUrl: body.imageUrl || body.image || "",
            companyId: context.companyId, // <--- REQUERIDO: Inyectar ID de sesión
        })

        // 3. Actualizar contador de productos en el uso del Plan
        try {
            await (Company as any).incrementUsage(context.companyId, 'products')
        } catch (usageErr) {
            console.error("Error updating usage stats (Products):", usageErr)
        }

        return NextResponse.json(product, { status: 201 })
    } catch (error: any) {
        console.error("Error creating product:", error)
        return NextResponse.json(
            { error: "Error al crear producto" },
            { status: 500 }
        )
    }
})
