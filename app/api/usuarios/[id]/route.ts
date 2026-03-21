import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import Company from "@/lib/db/models/Company"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (
    req: NextRequest,
    { params, context }: { params: { id: string }, context: any }
) => {
    try {
        await connectDB()

        // Validar companyId del contexto
        if (!context.companyId) {
            console.error("USER [ID] API: No companyId in context")
            return NextResponse.json({ error: "Falta companyId" }, { status: 400 })
        }

        const compId = context.companyId
        console.log("USER [ID] API: Fetching user for company:", compId, "user ID:", params.id)

        // Buscar usuario por ID y verificar que pertenezca a la empresa (CORREGIDO)
        const user = await User.findOne({ 
            _id: params.id,
            companyId: compId 
        })
            .select("-password")
            .lean()

        if (!user) {
            console.log(`USER [ID] API: User ${params.id} not found or not in company ${compId}`)
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            )
        }

        console.log(`USER [ID] API: Found user ${(user as any).username} in company ${compId}`)
        return NextResponse.json(user)
    } catch (error: any) {
        console.error("Error fetching user:", error)
        return NextResponse.json(
            { error: "Error al obtener usuario" },
            { status: 500 }
        )
    }
})

export const PUT = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const body = await req.json()
        const { fullName, username, email, role, permissions, password } = body

        // Crear objeto de actualización solo con los campos permitidos y definidos
        const updateFields: any = {};
        if (fullName) updateFields.fullName = fullName;
        if (username) updateFields.username = username;
        if (email) updateFields.email = email;
        if (role) updateFields.role = role;
        if (permissions) updateFields.permissions = permissions;


        let user = await User.findById(params.id)
        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        // Asignar campos para permitir que Mongoose maneje validaciones
        Object.assign(user, updateFields);

        // La contraseña se maneja por separado por el hash en el pre-save hook
        if (password && password.trim() !== "") {
            user.password = password;
        }

        await user.save(); // save() dispara los hooks pre('save') para hash de password

        // 🔗 Sincronización con la Empresa (si es el admin)
        if (user.role === 'admin' && user.companyId && email) {
            await Company.findByIdAndUpdate(
                user.companyId,
                { email: email }
            ).setOptions({ skipTenantFilter: true })
            console.log(`✅ Sincronizado email de empresa ${user.companyId} tras actualizar admin ${user._id}`)
        }

        const userResponse = (user as any).toObject()
        delete userResponse.password

        return NextResponse.json(userResponse)
    } catch (error: any) {
        console.error("Error updating user:", error)
        return NextResponse.json(
            { error: "Error al actualizar usuario" },
            { status: 500 }
        )
    }
})

export const DELETE = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const user = await User.findByIdAndUpdate(params.id, { isActive: false }, { new: true })

        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            )
        }

        return NextResponse.json({ message: "Usuario desactivado" })
    } catch (error: any) {
        console.error("Error deleting user:", error)
        return NextResponse.json(
            { error: "Error al eliminar usuario" },
            { status: 500 }
        )
    }
})
