import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User, { IUser } from "@/lib/db/models/User"
import { getSession } from "@/lib/auth"
import { runWithSession } from "@/lib/session-context"

// Verificar que el solicitante sea superadmin
async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") {
        return null
    }
    return user
}

// PATCH: Actualizar estado de un admin (activar/desactivar)
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

    return runWithSession({ role: 'superadmin', userId: superadmin.id }, async () => {
        try {
            await connectDB()

            const body = await req.json()
            const { isActive } = body

            if (typeof isActive !== 'boolean') {
                return NextResponse.json(
                    { error: "isActive debe ser un booleano" },
                    { status: 400 }
                )
            }

            const admin = await User.findOne({ _id: params.id }).setOptions({ skipTenantFilter: true })
            if (!admin) {
                return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
            }

            if (!['admin', 'seller'].includes(admin.role)) {
                return NextResponse.json(
                    { error: "Solo se puede modificar admins o vendedores" },
                    { status: 400 }
                )
            }

            const updatedAdmin = await User.findByIdAndUpdate(
                params.id,
                { 
                    isActive,
                    ...(isActive ? {} : { $unset: { sessionToken: 1 } })
                },
                { new: true }
            ).select('username email fullName isActive role companyId')

            if (!updatedAdmin) {
                return NextResponse.json({ error: "Error al actualizar" }, { status: 500 })
            }

            return NextResponse.json({
                message: `Usuario ${isActive ? 'activado' : 'desactivado'} exitosamente`,
                admin: updatedAdmin
            })

        } catch (error: any) {
            console.error("SUPERADMIN UPDATE ADMIN ERROR:", error)
            return NextResponse.json({ error: "Error al actualizar: " + error.message }, { status: 500 })
        }
    })
}

// DELETE: Eliminar un usuario (admin o vendedor) permanentemente
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

    return runWithSession({ role: 'superadmin', userId: superadmin.id }, async () => {
        try {
            await connectDB()

            console.log(`[SUPERADMIN DELETE USER] Attempting to delete user: ${params.id}`)

            // Buscar el usuario con skipTenantFilter para evitar bloqueos del plugin
            const userToDelete = await User.findOne({ _id: params.id }).setOptions({ skipTenantFilter: true })
            if (!userToDelete) {
                console.log(`[SUPERADMIN DELETE USER] User not found: ${params.id}`)
                return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
            }

            // No permitir borrar superadmins
            if (userToDelete.role === 'superadmin') {
                return NextResponse.json(
                    { error: "No se puede eliminar al superadmin" },
                    { status: 400 }
                )
            }

            const userName = userToDelete.fullName
            
            // Eliminar el usuario
            await User.deleteOne({ _id: params.id }, { skipTenantFilter: true } as any)

            console.log(`[SUPERADMIN DELETE USER] Successfully deleted: ${userName}`)

            return NextResponse.json({
                message: `Usuario "${userName}" eliminado exitosamente`
            })

        } catch (error: any) {
            console.error("SUPERADMIN DELETE USER ERROR:", error)
            return NextResponse.json(
                { error: "Error al eliminar usuario: " + error.message },
                { status: 500 }
            )
        }
    })
}
