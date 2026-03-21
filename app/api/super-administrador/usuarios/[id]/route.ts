import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User, { IUser } from "@/lib/db/models/User"
import { getSession } from "@/lib/auth"

// Verificar que el solicitante sea superadmin
async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") {
        return null
    }
    return user
}

// DELETE: Eliminar un usuario permanentemente
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const superadmin = await verifySuperAdmin()
    if (!superadmin) {
        return NextResponse.json(
            { error: "Acceso denegado. Solo superadmin." },
            { status: 403 }
        )
    }

    try {
        await connectDB()

        // Buscar el usuario
        const user = await User.findById(params.id)
        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            )
        }

        // Verificar que sea admin o seller (no se puede eliminar superadmin)
        if (!["admin", "seller"].includes(user.role)) {
            return NextResponse.json(
                { error: "No se puede eliminar este tipo de usuario" },
                { status: 400 }
            )
        }

        // Eliminar el usuario
        await User.findByIdAndDelete(params.id)

        return NextResponse.json({
            message: `${user.role === 'admin' ? 'Administrador' : 'Vendedor'} "${user.fullName}" eliminado exitosamente`
        })

    } catch (error: any) {
        console.error("SUPERADMIN DELETE USER ERROR:", error)
        return NextResponse.json(
            { error: "Error al eliminar usuario" },
            { status: 500 }
        )
    }
}

// PATCH: Cambiar rol de un usuario (admin ↔ seller)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
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
        const { role } = body

        if (!role || !["admin", "seller"].includes(role)) {
            return NextResponse.json(
                { error: "Rol inválido. Solo se permite 'admin' o 'seller'" },
                { status: 400 }
            )
        }

        // Buscar el usuario
        const user = await User.findById(params.id)
        if (!user) {
            return NextResponse.json(
                { error: "Usuario no encontrado" },
                { status: 404 }
            )
        }

        // Verificar que sea admin o seller (no se puede cambiar rol de superadmin)
        if (!["admin", "seller"].includes(user.role)) {
            return NextResponse.json(
                { error: "No se puede cambiar el rol de este tipo de usuario" },
                { status: 400 }
            )
        }

        // Verificar que no sea el mismo rol
        if (user.role === role) {
            return NextResponse.json(
                { error: "El usuario ya tiene ese rol" },
                { status: 400 }
            )
        }

        // Si se está promoviendo a admin, verificar límite de admins por empresa
        if (role === 'admin') {
            const existingAdmins = await User.countDocuments({
                companyId: user.companyId,
                role: 'admin',
                isActive: true,
                _id: { $ne: user._id } // Excluir al usuario actual
            })

            if (existingAdmins > 0) {
                return NextResponse.json(
                    { error: "Ya existe un administrador activo para esta empresa. Solo se permite un admin por empresa." },
                    { status: 400 }
                )
            }
        }

        // Actualizar rol
        const oldRole = user.role
        const updatedUser = await User.findByIdAndUpdate(
            params.id,
            { 
                role,
                // Limpiar sessionToken para forzar logout
                $unset: { sessionToken: 1 },
                // Si se degrada a seller, limpiar permisos de admin
                ...(role === 'seller' ? { permissions: [] } : {})
            },
            { new: true }
        ).select('username email fullName role companyId')

        if (!updatedUser) {
            return NextResponse.json(
                { error: "Error al actualizar rol" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: `Usuario "${updatedUser.fullName}" ${role === 'admin' ? 'promovido a administrador' : 'degradado a vendedor'} exitosamente`,
            user: updatedUser,
            oldRole,
            newRole: role
        })

    } catch (error: any) {
        console.error("SUPERADMIN UPDATE ROLE ERROR:", error)
        return NextResponse.json(
            { error: "Error al cambiar rol" },
            { status: 500 }
        )
    }
}
