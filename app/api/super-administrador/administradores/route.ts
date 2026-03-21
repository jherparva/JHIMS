import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import Company from "@/lib/db/models/Company"
import { getSession } from "@/lib/auth"
import { createToken } from "@/lib/auth"
import bcrypt from "bcryptjs"

// Verificar que el solicitante sea superadmin
async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") {
        return null
    }
    return user
}

// POST: Crear administrador para una empresa específica
export async function POST(req: NextRequest) {
    const superAdmin = await verifySuperAdmin()
    if (!superAdmin) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    try {
        await connectDB()
        const body = await req.json()
        const { fullName, username, email, password, companyId } = body

        // Validaciones básicas
        if (!fullName || !username || !email || !password || !companyId) {
            return NextResponse.json(
                { error: "Todos los campos son requeridos" },
                { status: 400 }
            )
        }

        // Verificar que la empresa existe
        const company = await Company.findById(companyId)
        if (!company) {
            return NextResponse.json(
                { error: "La empresa especificada no existe" },
                { status: 404 }
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

        // Verificar si ya existe un admin para esta empresa
        const existingAdmin = await User.findOne({
            companyId,
            role: "admin"
        })

        // Si ya existe un admin, lo eliminamos permanentemente (no solo desactivar)
        if (existingAdmin) {
            await User.findByIdAndDelete(existingAdmin._id)
            console.log(`Administrador anterior ${existingAdmin.fullName} eliminado permanentemente`)
        }

        // Crear el administrador
        const admin = await User.create({
            fullName,
            username,
            email,
            password, // El hasheo se encarga el pre-save hook del modelo User.ts
            role: "admin",
            companyId,
            isActive: true,
            permissions: [], // Los admins tienen todos los permisos por defecto
        })

        // Actualizar la empresa para marcar que tiene admin
        await Company.findByIdAndUpdate(companyId, {
            $set: { hasAdmin: true }
        })

        // Verificación final: asegurar que el usuario fue creado correctamente
        const verification = await User.findById(admin._id).select('username email role companyId isActive');
        if (!verification || !verification.isActive) {
            throw new Error('Error al verificar la creación del administrador');
        }

        console.log('✅ Admin creado y verificado:', {
            username: verification.username,
            email: verification.email,
            role: verification.role,
            companyId: verification.companyId,
            isActive: verification.isActive
        });

        // Crear token de sesión para el nuevo admin (opcional, para enviar por email)
        const sessionToken = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15)
        const token = await createToken({
            id: admin._id.toString(),
            username: admin.username,
            email: admin.email,
            role: admin.role,
            fullName: admin.fullName,
            permissions: [],
            companyId: admin.companyId?.toString()
        }, sessionToken)

        const adminResponse = admin.toObject()
        delete adminResponse.password

        const responseMessage = existingAdmin 
            ? `Administrador reemplazado exitosamente. Anterior admin desactivado.`
            : `Administrador creado exitosamente`

        return NextResponse.json({
            ...adminResponse,
            company: {
                id: company._id,
                name: company.name,
                email: company.email
            },
            message: responseMessage,
            replacedAdmin: existingAdmin ? {
                fullName: existingAdmin.fullName,
                email: existingAdmin.email
            } : null
        }, { status: 201 })

    } catch (error: any) {
        console.error("SUPERADMIN CREATE ADMIN ERROR:", error)
        return NextResponse.json(
            { error: "Error al crear administrador" },
            { status: 500 }
        )
    }
}

// GET: Listar todos los administradores con sus empresas
export async function GET(req: NextRequest) {
    const superAdmin = await verifySuperAdmin()
    if (!superAdmin) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    try {
        await connectDB()

        const admins = await User.find({ role: "admin" })
            .select("-password")
            .populate('companyId', 'name email status plan')
            .sort({ createdAt: -1 })
            .lean()

        return NextResponse.json(admins)

    } catch (error: any) {
        console.error("SUPERADMIN LIST ADMINS ERROR:", error)
        return NextResponse.json(
            { error: "Error al obtener administradores" },
            { status: 500 }
        )
    }
}
