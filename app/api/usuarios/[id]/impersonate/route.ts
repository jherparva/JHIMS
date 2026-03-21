import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import { withSessionContext } from "@/lib/api-wrapper"
import { createToken, TOKEN_NAME, SessionUser } from "@/lib/auth"
import { cookies } from "next/headers"

const ORIGINAL_TOKEN_NAME = "jhims-original-token"

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const { id } = context.params // ID del vendedor a suplantar

        // 1. Verificar que el usuario actual es ADMIN o SUPERADMIN
        if (context.role !== "admin" && context.role !== "superadmin") {
            return NextResponse.json({ error: "Solo los administradores pueden ver como otro usuario" }, { status: 403 })
        }

        // 2. Buscar al vendedor
        const seller = await User.findById(id).lean() as any
        if (!seller) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        // 3. Verificar que pertenece a la misma empresa (si es admin)
        if (context.role === "admin" && seller.companyId.toString() !== context.companyId.toString()) {
            return NextResponse.json({ error: "No tienes permiso para ver como este usuario" }, { status: 403 })
        }

        // 4. Guardar el token actual (del admin) en una cookie separada
        const cookieStore = await cookies()
        const currentToken = cookieStore.get(TOKEN_NAME)?.value

        if (!currentToken) {
            return NextResponse.json({ error: "Sesión no válida" }, { status: 401 })
        }

        // Guardamos el token original por 2 horas
        cookieStore.set(ORIGINAL_TOKEN_NAME, currentToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 2,
            path: "/",
        })

        // 5. Crear nuevo token para el vendedor
        const sellerSession: SessionUser = {
            id: seller._id.toString(),
            username: seller.username,
            email: seller.email,
            role: seller.role,
            fullName: seller.fullName,
            permissions: seller.permissions || [],
            companyId: seller.companyId.toString(),
            impersonatedBy: context.userId // Guardamos quién lo está suplantando
        }

        const newToken = await createToken(sellerSession)

        // 6. Aplicar el nuevo token como la sesión activa
        cookieStore.set(TOKEN_NAME, newToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 2,
            path: "/",
        })

        return NextResponse.json({ 
            success: true, 
            message: `Ahora estás viendo como ${seller.fullName}`,
            redirect: "/dashboard" // Redirigir al dashboard para ver los cambios
        })
    } catch (error: any) {
        console.error("IMPERSONATE ERROR:", error)
        return NextResponse.json({ error: "Error al iniciar simulación" }, { status: 500 })
    }
})
