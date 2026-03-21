import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Company from "@/lib/db/models/Company"
import Category from "@/lib/db/models/Category"
import { getSession } from "@/lib/auth"

const DEFAULT_CATEGORIES: Record<string, string[]> = {
    tienda: ["Alimentos", "Bebidas", "Aseo Personal", "Aseo Hogar", "Dulcería", "Licores y Cigarrillos", "Mascotas", "Papelería", "Otros"],
    ferreteria: ["Herramientas Manuales", "Herramientas Eléctricas", "Pinturas", "Plomería", "Electricidad", "Tornillería", "Construcción", "Otros"],
    restaurante: ["Entradas", "Platos Fuertes", "Bebidas", "Postres", "Licores", "Adiciones", "Otros"]
}

export const dynamic = "force-dynamic"

async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") return null
    return user
}

// PATCH: Cambiar estado de una empresa (activar/suspender/cancelar)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    try {
        await connectDB()
        const { status, plan, businessType, initCategories } = await req.json()

        const company = await Company.findById(params.id)
        if (!company) {
            return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
        }

        if (status) company.status = status
        if (businessType) company.businessType = businessType
        
        if (plan && plan !== company.plan) {
            company.plan = plan
            // Actualizar límites automáticos según el nuevo plan
            const { PLANS } = await import("@/lib/db/models/Company")
            const planConfig = PLANS[plan]
            if (planConfig) {
                company.limits = planConfig.limits
            }
        }

        await company.save()

        // Lógica de generación manual de categorías
        if (initCategories) {
            const bType = businessType || company.businessType || 'tienda'
            const defaultCats = DEFAULT_CATEGORIES[bType] || DEFAULT_CATEGORIES.tienda
            
            // Verificamos cuáles ya existen para evitar error de índice
            const existingCats = await Category.find({ 
                companyId: params.id,
                name: { $in: defaultCats }
            }).select('name')
            
            const existingNames = existingCats.map(c => c.name)
            const catsToInsert = defaultCats.filter(name => !existingNames.includes(name))
            
            if (catsToInsert.length > 0) {
                await Category.insertMany(
                    catsToInsert.map(catName => ({
                        companyId: params.id,
                        name: catName,
                        description: `Generado automáticamente - ${bType}`,
                        isActive: true
                    }))
                )
            }
        }

        return NextResponse.json({ success: true, company })
    } catch (error: any) {
        console.error("UPDATE COMPANY ERROR:", error)
        return NextResponse.json({ error: "Error al actualizar empresa" }, { status: 500 })
    }
}

// DELETE: Eliminar empresa (irreversible)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    try {
        await connectDB()
        await Company.findByIdAndDelete(params.id)
        return NextResponse.json({ success: true })
    } catch (error: any) {
        return NextResponse.json({ error: "Error al eliminar empresa" }, { status: 500 })
    }
}
