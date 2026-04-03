import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import { getSession } from "@/lib/auth"
import { runWithSession } from "@/lib/session-context"

// Verificar que el solicitante sea superadmin
async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") return null
    return user
}

// DELETE: Eliminar un usuario permanentemente
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const superadmin = await verifySuperAdmin()
    if (!superadmin) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    return runWithSession({ role: 'superadmin', userId: superadmin.id }, async () => {
        try {
            await connectDB()

            const user = await User.findOne({ _id: params.id }).setOptions({ skipTenantFilter: true })
            if (!user) {
                return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
            }

            if (user.role === 'superadmin') {
                return NextResponse.json({ error: "No se puede eliminar al superadmin" }, { status: 400 })
            }

            const userName = user.fullName
            const userRole = user.role

            await User.deleteOne({ _id: params.id }).setOptions({ skipTenantFilter: true })

            return NextResponse.json({
                message: `${userRole === 'admin' ? 'Administrador' : 'Vendedor'} "${userName}" eliminado exitosamente`
            })

        } catch (error: any) {
            console.error("SUPERADMIN DELETE USER ERROR:", error)
            return NextResponse.json({ error: "Error al eliminar usuario: " + error.message }, { status: 500 })
        }
    })
}

// PATCH: Cambiar rol de un usuario (admin ↔ seller)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const superadmin = await verifySuperAdmin()
    if (!superadmin) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    return runWithSession({ role: 'superadmin', userId: superadmin.id }, async () => {
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

            const user = await User.findOne({ _id: params.id }).setOptions({ skipTenantFilter: true })
            if (!user) {
                return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
            }

            if (!["admin", "seller"].includes(user.role)) {
                return NextResponse.json(
                    { error: "No se puede cambiar el rol de este tipo de usuario" },
                    { status: 400 }
                )
            }

            if (user.role === role) {
                return NextResponse.json({ error: "El usuario ya tiene ese rol" }, { status: 400 })
            }

            const oldRole = user.role
            const updatedUser = await User.findByIdAndUpdate(
                params.id,
                {
                    role,
                    $unset: { sessionToken: 1 },
                    ...(role === 'seller' ? { permissions: [] } : {})
                },
                { new: true }
            ).setOptions({ skipTenantFilter: true }).select('username email fullName role companyId')

            if (!updatedUser) {
                return NextResponse.json({ error: "Error al actualizar rol" }, { status: 500 })
            }

            return NextResponse.json({
                message: `Usuario "${updatedUser.fullName}" ${role === 'admin' ? 'promovido a administrador' : 'degradado a vendedor'} exitosamente`,
                user: updatedUser,
                oldRole,
                newRole: role
            })

        } catch (error: any) {
            console.error("SUPERADMIN UPDATE ROLE ERROR:", error)
            return NextResponse.json({ error: "Error al cambiar rol: " + error.message }, { status: 500 })
        }
    })
}
