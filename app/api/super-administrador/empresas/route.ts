import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Company from "@/lib/db/models/Company"
import User from "@/lib/db/models/User"
import Product from "@/lib/db/models/Product"
import Sale from "@/lib/db/models/Sale"
import Category from "@/lib/db/models/Category"
import { getSession } from "@/lib/auth"
const DEFAULT_CATEGORIES: Record<string, string[]> = {
    tienda: [
        "Abarrotes", "Lácteos y Huevos", "Carnes y Embutidos", "Bebidas y Jugos", 
        "Licores y Cervezas", "Aseo Personal", "Aseo del Hogar", "Dulcería y Snacks", 
        "Panadería", "Desechables", "Frutas y Verduras", "Mascotas", "Medicamentos Básicos", "Mecato Colombiano", "Otros"
    ],
    ferreteria: [
        "Herramientas Manuales", "Herramientas Eléctricas", "Pinturas y Solventes", 
        "Plomería y Tuberías", "Material Eléctrico", "Tornillería y Clavos", 
        "Materiales de Construcción", "Cerrajería", "Adhesivos y Pegantes", "Abrasivos", "Madera y Tableros", "Otros"
    ],
    restaurante: [
        "Entradas", "Sopas y Cremas", "Platos Fuertes", "Comida Rápida", 
        "Bebidas Frias", "Bebidas Calientes", "Postres", "Licores y Cócteles", 
        "Menú Infantil", "Adiciones y Extras", "Desayunos", "Otros"
    ],
    otro: ["General", "Servicios", "Productos", "Insumos", "Otros"]
}

// Productos comunes en Colombia pre-configurados (con precio/costo/stock en 0 para que el usuario solo rellene)
const DEFAULT_PRODUCTS: Record<string, {name: string; cat: string}[]> = {
    tienda: [
        { name: "Arroz Roa 500g", cat: "Abarrotes" },
        { name: "Arroz Diana 500g", cat: "Abarrotes" },
        { name: "Aceite Gourmet 1000ml", cat: "Abarrotes" },
        { name: "Panela Cuadrada", cat: "Abarrotes" },
        { name: "Azúcar Manuelita 1kg", cat: "Abarrotes" },
        { name: "Sal Refisal 1kg", cat: "Abarrotes" },
        { name: "Café Sello Rojo 250g", cat: "Abarrotes" },
        { name: "Huevos Tipo A x 30", cat: "Lácteos y Huevos" },
        { name: "Leche Alquería Entera 1L", cat: "Lácteos y Huevos" },
        { name: "Leche Colanta Entera 1L", cat: "Lácteos y Huevos" },
        { name: "Queso Campesino", cat: "Lácteos y Huevos" },
        { name: "Mantequilla Rama", cat: "Lácteos y Huevos" },
        { name: "Salchicha Ranchera", cat: "Carnes y Embutidos" },
        { name: "Chorizo Santarrosano", cat: "Carnes y Embutidos" },
        { name: "Mortadela Tradicional", cat: "Carnes y Embutidos" },
        { name: "Gaseosa Coca-Cola 350ml", cat: "Bebidas y Jugos" },
        { name: "Gaseosa Postobón Manzana 350ml", cat: "Bebidas y Jugos" },
        { name: "Jugo Hit Mora", cat: "Bebidas y Jugos" },
        { name: "Pony Malta", cat: "Bebidas y Jugos" },
        { name: "Agua Cristal 600ml", cat: "Bebidas y Jugos" },
        { name: "Cerveza Poker Lata", cat: "Licores y Cervezas" },
        { name: "Cerveza Aguila Lata", cat: "Licores y Cervezas" },
        { name: "Cerveza Club Colombia Gold", cat: "Licores y Cervezas" },
        { name: "Crema Dental Colgate", cat: "Aseo Personal" },
        { name: "Papel Higiénico Familia", cat: "Aseo Personal" },
        { name: "Jabón Rey", cat: "Aseo del Hogar" },
        { name: "Detergente Ariel", cat: "Aseo del Hogar" },
        { name: "Limpiador Fabuloso", cat: "Aseo del Hogar" },
        { name: "Chocoramo", cat: "Dulcería y Snacks" },
        { name: "Papas Margarita Pollo", cat: "Dulcería y Snacks" },
        { name: "Papas Margarita Limón", cat: "Dulcería y Snacks" },
        { name: "Detodito Mix", cat: "Dulcería y Snacks" },
        { name: "Bombonbum", cat: "Dulcería y Snacks" },
        { name: "Galletas Festival", cat: "Dulcería y Snacks" },
        { name: "Galletas Saltín Noel", cat: "Dulcería y Snacks" }
    ],
    ferreteria: [
        { name: "Martillo Goma", cat: "Herramientas Manuales" },
        { name: "Destornillador Estrella", cat: "Herramientas Manuales" },
        { name: "Destornillador Pala", cat: "Herramientas Manuales" },
        { name: "Cinta de Enmascarar", cat: "Adhesivos y Pegantes" },
        { name: "Cinta Aislante Negra", cat: "Material Eléctrico" },
        { name: "Pintura Viniltex Blanco 1 Galón", cat: "Pinturas y Solventes" },
        { name: "Thinner Corriente", cat: "Pinturas y Solventes" },
        { name: "Tubo PVC Presión 1/2", cat: "Plomería y Tuberías" },
        { name: "Pegante PVC", cat: "Adhesivos y Pegantes" },
        { name: "Clavos Con Cabeza", cat: "Tornillería y Clavos" },
        { name: "Tornillo Goloso", cat: "Tornillería y Clavos" },
        { name: "Bombillo LED 9W", cat: "Material Eléctrico" },
        { name: "Tomacorriente Doble", cat: "Material Eléctrico" },
        { name: "Interruptor Sencillo", cat: "Material Eléctrico" },
        { name: "Cemento Argos 50kg", cat: "Materiales de Construcción" }
    ],
    restaurante: [
        { name: "Empanada de Carne", cat: "Entradas" },
        { name: "Arepa de Choclo", cat: "Entradas" },
        { name: "Patacón con Hogao", cat: "Entradas" },
        { name: "Sancocho Trifásico", cat: "Sopas y Cremas" },
        { name: "Ajiaco Santafereño", cat: "Sopas y Cremas" },
        { name: "Bandeja Paisa", cat: "Platos Fuertes" },
        { name: "Churrasco", cat: "Platos Fuertes" },
        { name: "Pechuga a la Plancha", cat: "Platos Fuertes" },
        { name: "Mojarra Frita", cat: "Platos Fuertes" },
        { name: "Hamburguesa Sencilla", cat: "Comida Rápida" },
        { name: "Hamburguesa Especial", cat: "Comida Rápida" },
        { name: "Perro Caliente", cat: "Comida Rápida" },
        { name: "Jugo Natural en Agua", cat: "Bebidas Frias" },
        { name: "Jugo Natural en Leche", cat: "Bebidas Frias" },
        { name: "Limonada Natural", cat: "Bebidas Frias" },
        { name: "Gaseosa Envase 350ml", cat: "Bebidas Frias" },
        { name: "Cerveza Nacional", cat: "Licores y Cócteles" },
        { name: "Tinto", cat: "Bebidas Calientes" },
        { name: "Chocolate", cat: "Bebidas Calientes" },
        { name: "Arroz con Leche", cat: "Postres" },
        { name: "Adición de Papas a la Francesa", cat: "Adiciones y Extras" }
    ]
}

// Verificar que el solicitante sea superadmin
import { sessionContext, runWithSession } from "@/lib/session-context"

// ... (DEFAULT_CATEGORIES and DEFAULT_PRODUCTS stay the same)

// Verificar que el solicitante sea superadmin
async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") {
        return null
    }
    return user
}

// GET: Estadísticas globales + listado de empresas
export async function GET(req: NextRequest) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    return runWithSession({ role: 'superadmin', userId: user.id }, async () => {
        try {
            await connectDB()

            // Estadísticas globales de la plataforma
            const [totalCompanies, activeCompanies, totalUsers, companies] = await Promise.all([
                Company.countDocuments({}),
                Company.countDocuments({ status: "active" }),
                User.countDocuments({ role: { $ne: "superadmin" } }),
                Company.find({})
                    .sort({ createdAt: -1 })
                    .lean()
            ])

            // Para cada empresa, obtener su admin (o admins) y número de ventas
            const companiesWithDetails = await Promise.all(
                companies.map(async (company) => {
                    // Obtener TODOS los admins de esta empresa
                    const adminUsers = await User.find({ companyId: company._id, role: "admin" })
                        .select("fullName email username")
                        .lean()
                    
                    const [salesCount, totalRevenue] = await Promise.all([
                        Sale.countDocuments({ companyId: company._id }),
                        Sale.aggregate([
                            { $match: { companyId: company._id } },
                            { $group: { _id: null, total: { $sum: "$total" } } }
                        ])
                    ])

                    // Mostrar el primer admin como principal
                    const primaryAdmin = adminUsers[0] || null
                    const additionalAdmins = adminUsers.length > 1 ? adminUsers.length - 1 : 0

                    return {
                        ...company,
                        email: primaryAdmin ? (primaryAdmin as any).email : company.email,
                        adminUser: primaryAdmin ? {
                            _id: (primaryAdmin as any)._id?.toString(),
                            fullName: (primaryAdmin as any).fullName,
                            email: (primaryAdmin as any).email,
                            username: (primaryAdmin as any).username
                        } : null,
                        adminUsers: adminUsers,
                        additionalAdmins,
                        salesCount,
                        totalRevenue: totalRevenue[0]?.total || 0
                    }
                })
            )

            return NextResponse.json({
                stats: {
                    totalCompanies,
                    activeCompanies,
                    suspendedCompanies: companies.filter(c => c.status === "suspended").length,
                    pendingCompanies: companies.filter(c => c.status === "pending").length,
                    totalUsers,
                },
                companies: companiesWithDetails
            })
        } catch (error: any) {
            console.error("SUPERADMIN API ERROR:", error)
            return NextResponse.json({ error: "Error al obtener datos" }, { status: 500 })
        }
    })
}

// POST: Crear nueva empresa
export async function POST(req: NextRequest) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    return runWithSession({ role: 'superadmin', userId: user.id }, async () => {
        try {
            await connectDB()
            const body = await req.json()
            const { name, email, phone, plan = "free", status = "pending", businessType = "tienda" } = body

            // Validaciones básicas
            if (!name || !email) {
                return NextResponse.json(
                    { error: "Nombre y email de la empresa son requeridos" },
                    { status: 400 }
                )
            }

            // Importar PLANS para obtener límites
            const { PLANS } = await import("@/lib/db/models/Company")
            const planConfig = PLANS[plan]
            if (!planConfig) {
                return NextResponse.json(
                    { error: "Plan inválido" },
                    { status: 400 }
                )
            }

            // Generar slug único
            let baseSlug = name.toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim('-')
            
            let slug = baseSlug
            let counter = 1
            
            // Verificar si el slug ya existe y generar uno único
            while (await Company.findOne({ slug })) {
                slug = `${baseSlug}-${counter}`
                counter++
            }

            // Verificar si la empresa ya existe
            const existingCompany = await Company.findOne({
                $or: [{ name }, { email }]
            })

            if (existingCompany) {
                return NextResponse.json(
                    { error: "Ya existe una empresa con ese nombre o email" },
                    { status: 400 }
                )
            }

            // Crear la empresa
            const company = await Company.create({
                slug,
                name,
                email,
                phone: phone || "",
                businessType,
                plan,
                status,
                additionalUsers: 0,
                subscriptionStart: new Date(),
                limits: planConfig.limits,
                usage: {
                    currentUsers: 0,
                    currentProducts: 0,
                    currentSalesThisMonth: 0,
                    currentStorageGB: 0,
                    lastResetDate: new Date()
                },
                supportPriority: "standard",
                approvedBy: user.id,
                approvedAt: new Date()
            })

            // CREACIÓN AUTOMÁTICA DE CATEGORÍAS
            const defaultCats = DEFAULT_CATEGORIES[businessType] || DEFAULT_CATEGORIES.tienda
            const createdCats = await Category.insertMany(
                defaultCats.map(catName => ({
                    companyId: company._id,
                    name: catName,
                    description: `Generado automáticamente - ${businessType}`,
                    isActive: true
                }))
            )

            // Mapear los _ids de las categorías creadas
            const catMap = createdCats.reduce((acc, cat) => {
                acc[cat.name] = cat._id
                return acc
            }, {} as Record<string, any>)

            // CREACIÓN AUTOMÁTICA DE PRODUCTOS
            const defaultProds = DEFAULT_PRODUCTS[businessType] || DEFAULT_PRODUCTS.tienda
            
            let skuCounter = 1;
            const productsToInsert = defaultProds.map((prod:any) => {
                const catId = catMap[prod.cat] || createdCats[0]?._id 
                const paddedSku = skuCounter.toString().padStart(4, '0')
                skuCounter++
                
                return {
                    companyId: company._id,
                    name: prod.name,
                    description: `Generado automáticamente - ${businessType}`,
                    sku: `SKU-${businessType.substring(0,3).toUpperCase()}-${paddedSku}`,
                    category: catId,
                    purchasePrice: 0,
                    salePrice: 0,
                    stock: 0,
                    minStock: 5,
                    isActive: true
                }
            })
            
            if (productsToInsert.length > 0) {
                await Product.insertMany(productsToInsert)
            }

            return NextResponse.json({
                _id: company._id,
                slug: company.slug,
                name: company.name,
                email: company.email,
                plan: company.plan,
                status: company.status,
                createdAt: company.createdAt,
                message: "Empresa creada exitosamente"
            }, { status: 201 })

        } catch (error: any) {
            console.error("SUPERADMIN CREATE COMPANY ERROR:", error)
            return NextResponse.json(
                { error: "Error al crear empresa: " + (error.message || "Error desconocido") },
                { status: 500 }
            )
        }
    })
}
