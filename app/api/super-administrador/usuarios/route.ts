import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User, { IUser } from "@/lib/db/models/User"
import { getSession } from "@/lib/auth"
import bcrypt from "bcryptjs"

// Verificar que el solicitante sea superadmin
async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") {
        return null
    }
    return user
}

// GET: Obtener usuarios de una empresa específica
export async function GET(req: NextRequest) {
    const superadmin = await verifySuperAdmin()
    if (!superadmin) {
        return NextResponse.json(
            { error: "Acceso denegado. Solo superadmin." },
            { status: 403 }
        )
    }

    try {
        await connectDB()

        const { searchParams } = new URL(req.url)
        const companyId = searchParams.get('companyId')

        if (!companyId) {
            return NextResponse.json(
                { error: "CompanyId es requerido" },
                { status: 400 }
            )
        }

        // Obtener todos los usuarios de la empresa (admin y vendedores)
        const users = await User.find({ 
            companyId, 
            role: { $in: ["admin", "seller"] },
            isActive: true
        })
        .select('username email fullName role isActive createdAt permissions')
        .sort({ role: -1, createdAt: 1 }) // Admins primero, luego vendedores
        .lean()

        return NextResponse.json({
            users: users.map(user => ({
                _id: user._id,
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                isActive: user.isActive,
                permissions: user.permissions || [],
                createdAt: user.createdAt
            }))
        })

    } catch (error: any) {
        console.error("SUPERADMIN GET USERS ERROR:", error)
        return NextResponse.json(
            { error: "Error al obtener usuarios" },
            { status: 500 }
        )
    }
}

// PATCH: Cambiar contraseña de un usuario
export async function PATCH(req: NextRequest) {
    const superadmin = await verifySuperAdmin()
    if (!superadmin) {
        return NextResponse.json(
            { error: "Acceso denegado. Solo superadmin." },
            { status: 403 }
        )
    }

    try {
        await connectDB()

        const body = await req.json()
        const { userId, newPassword } = body

        if (!userId || !newPassword) {
            return NextResponse.json(
                { error: "UserId y newPassword son requeridos" },
                { status: 400 }
            )
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 6 caracteres" },
                { status: 400 }
            )
        }

        // Buscar el usuario
        const user = await User.findById(userId)
        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            )
        }

        // Verificar que sea admin o seller
        if (!["admin", "seller"].includes(user.role)) {
            return NextResponse.json(
                { error: "Solo se puede cambiar contraseña a admins o vendedores" },
                { status: 400 }
            )
        }

        // Actualizar contraseña (el pre-save hook del modelo lo hasheará)
        user.password = newPassword
        // Limpiar sessionToken para forzar logout
        user.sessionToken = undefined 
        
        await user.save()

        return NextResponse.json({
            message: "Contraseña actualizada exitosamente",
            user: {
                username: user.username,
                email: user.email,
                fullName: user.fullName,
                role: user.role
            }
        })

    } catch (error: any) {
        console.error("SUPERADMIN UPDATE PASSWORD ERROR:", error)
        return NextResponse.json(
            { error: "Error al actualizar contraseña" },
            { status: 500 }
        )
    }
}

// POST: Crear nuevo vendedor (respetando límites del plan)
export async function POST(req: NextRequest) {
    const superadmin = await verifySuperAdmin()
    if (!superadmin) {
        return NextResponse.json(
            { error: "Acceso denegado. Solo superadmin." },
            { status: 403 }
        )
    }

    try {
        await connectDB()

        const body = await req.json()
        const { companyId, fullName, username, email, password, permissions = [] } = body

        if (!companyId || !fullName || !username || !email || !password) {
            return NextResponse.json(
                { error: "Todos los campos son requeridos" },
                { status: 400 }
            )
        }

        // Verificar si la empresa existe
        const Company = (await import("@/lib/db/models/Company")).default
        const company = await Company.findById(companyId)
        if (!company) {
            return NextResponse.json(
                { error: "Empresa no encontrada" },
                { status: 404 }
            )
        }

        // Verificar límites del plan
        const { PLANS } = await import("@/lib/db/models/Company")
        const planConfig = PLANS[company.plan]
        const maxUsers = planConfig.limits.maxUsers

        // Contar usuarios actuales de la empresa (admin + vendedores)
        const currentUsers = await User.countDocuments({ 
            companyId, 
            role: { $in: ["admin", "seller"] }, 
            isActive: true 
        })

        // Para plan gratis: 1 admin + (maxUsers - 1) vendedores
        // Para otros planes: maxUsers totales (admin + vendedores)
        const maxSellers = company.plan === 'free' ? (maxUsers - 1) : (maxUsers - 1) // Dejar 1 para admin
        const currentSellers = await User.countDocuments({ 
            companyId, 
            role: "seller", 
            isActive: true 
        })

        if (currentSellers >= maxSellers) {
            return NextResponse.json(
                { error: `Límite de vendedores alcanzado. Plan ${company.plan} permite máximo ${maxSellers} vendedores.` },
                { status: 400 }
            )
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            $or: [{ username }, { email }]
        })

        if (existingUser) {
            return NextResponse.json(
                { error: "El usuario o email ya existe" },
                { status: 400 }
            )
        }

        // Crear el vendedor
        const seller = await User.create({
            fullName,
            username,
            email,
            password, // El hasheo se encarga el pre-save hook del modelo User.ts
            role: "seller",
            companyId,
            isActive: true,
            permissions
        })

        const sellerResponse = seller.toObject()
        delete sellerResponse.password

        return NextResponse.json({
            message: "Vendedor creado exitosamente",
            seller: sellerResponse,
            remainingSlots: maxSellers - (currentSellers + 1)
        }, { status: 201 })

    } catch (error: any) {
        console.error("SUPERADMIN CREATE SELLER ERROR:", error)
        return NextResponse.json(
            { error: "Error al crear vendedor" },
            { status: 500 }
        )
    }
}
