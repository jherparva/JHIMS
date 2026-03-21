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

// PATCH: Actualizar estado de un admin (activar/desactivar)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json(
            { error: "Acceso denegado. Solo superadmin." },
            { status: 403 }
        )
    }

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

        // Buscar el admin
        const admin = await User.findById(params.id)
        if (!admin) {
            return NextResponse.json(
                { error: "Administrador no encontrado" },
                { status: 404 }
            )
        }

        if (admin.role !== 'admin') {
            return NextResponse.json(
                { error: "Solo se puede modificar el estado de administradores" },
                { status: 400 }
            )
        }

        // Actualizar estado
        const updatedAdmin = await User.findByIdAndUpdate(
            params.id,
            { 
                isActive,
                // Si se desactiva, limpiar sessionToken
                ...(isActive ? {} : { $unset: { sessionToken: 1 } })
            },
            { new: true }
        ).select('username email fullName isActive role companyId')

        if (!updatedAdmin) {
            return NextResponse.json(
                { error: "Error al actualizar administrador" },
                { status: 500 }
            )
        }

        return NextResponse.json({
            message: `Administrador ${isActive ? 'activado' : 'desactivado'} exitosamente`,
            admin: updatedAdmin
        })

    } catch (error: any) {
        console.error("SUPERADMIN UPDATE ADMIN ERROR:", error)
        return NextResponse.json(
            { error: "Error al actualizar administrador" },
            { status: 500 }
        )
    }
}

// DELETE: Eliminar un admin permanentemente
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json(
            { error: "Acceso denegado. Solo superadmin." },
            { status: 403 }
        )
    }

    try {
        await connectDB()

        // Buscar el admin
        const admin = await User.findById(params.id)
        if (!admin) {
            return NextResponse.json(
                { error: "Administrador no encontrado" },
                { status: 404 }
            )
        }

        if (admin.role !== 'admin') {
            return NextResponse.json(
                { error: "Solo se puede eliminar administradores" },
                { status: 400 }
            )
        }

        // Eliminar el admin
        await User.findByIdAndDelete(params.id)

        return NextResponse.json({
            message: `Administrador ${admin.fullName} eliminado exitosamente`
        })

    } catch (error: any) {
        console.error("SUPERADMIN DELETE ADMIN ERROR:", error)
        return NextResponse.json(
            { error: "Error al eliminar administrador" },
            { status: 500 }
        )
    }
}
