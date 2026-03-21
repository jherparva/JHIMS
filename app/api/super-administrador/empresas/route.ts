import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Company from "@/lib/db/models/Company"
import User from "@/lib/db/models/User"
import Sale from "@/lib/db/models/Sale"
import Category from "@/lib/db/models/Category"
import { getSession } from "@/lib/auth"

// Categorías por defecto según tipo de negocio
const DEFAULT_CATEGORIES: Record<string, string[]> = {
    tienda: [
        "Alimentos",
        "Bebidas",
        "Aseo Personal",
        "Aseo Hogar",
        "Dulcería",
        "Licores y Cigarrillos",
        "Mascotas",
        "Papelería",
        "Otros"
    ],
    ferreteria: [
        "Herramientas Manuales",
        "Herramientas Eléctricas",
        "Pinturas",
        "Plomería",
        "Electricidad",
        "Tornillería",
        "Construcción",
        "Otros"
    ],
    restaurante: [
        "Entradas",
        "Platos Fuertes",
        "Bebidas",
        "Postres",
        "Licores",
        "Adiciones",
        "Otros"
    ]
}

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

                // 💡 MEJORA: Usar los datos REALES del admin para la visualización
                // Si el admin cambió su correo o nombre, el superadmin verá lo más reciente.
                return {
                    ...company,
                    // Si hay admin, sobreescribimos el email de la empresa con el del admin para la tabla
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
}

// POST: Crear nueva empresa
export async function POST(req: NextRequest) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

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

        // Crear la empresa con todos los campos requeridos
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
            approvedBy: user.id, // El superadmin que la aprueba
            approvedAt: new Date()
        })

        // CREACIÓN AUTOMÁTICA DE CATEGORÍAS
        const defaultCats = DEFAULT_CATEGORIES[businessType] || DEFAULT_CATEGORIES.tienda
        await Category.insertMany(
            defaultCats.map(catName => ({
                companyId: company._id,
                name: catName,
                description: `Categoría por defecto para ${businessType}`,
                isActive: true
            }))
        )

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
}
