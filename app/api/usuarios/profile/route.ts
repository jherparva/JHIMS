import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic";

import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import Company from "@/lib/db/models/Company"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        console.log('DEBUG: Fetching user profile for ID:', context.userId)

        const user = await User.findById(context.userId)
            .setOptions({ skipTenantFilter: true }) // Trust session userId
            .select("-password")
            .lean()

        if (!user) {
            console.warn('DEBUG: User not found in database for ID:', context.userId)
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        return NextResponse.json(user)
    } catch (error) {
        console.error('DEBUG: Profile GET error:', error)
        return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 })
    }
})

export const PUT = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const body = await req.json()
        const { fullName, email, phone } = body

        console.log('DEBUG: Updating user profile for ID:', context.userId, 'with body:', { fullName, email, phone })

        const user = await User.findByIdAndUpdate(
            context.userId,
            { fullName, email, phone },
            { new: true, runValidators: true }
        ).setOptions({ skipTenantFilter: true })

        if (!user) {
            return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
        }

        // 🔗 Sincronización con la Empresa
        // Si el usuario es admin, actualizamos los datos de la empresa para que se reflejen en Superadmin
        if (user.role === 'admin' && user.companyId) {
            await Company.findByIdAndUpdate(
                user.companyId,
                { 
                    // Siempre sincronizar el email de contacto de la empresa con el del admin principal
                    email: email 
                }
            ).setOptions({ skipTenantFilter: true })
            
            console.log(`✅ Sincronizado email de empresa ${user.companyId} con el nuevo email del admin: ${email}`)
        }

        const userResponse = (user as any).toObject()
        delete userResponse.password

        return NextResponse.json(userResponse)
    } catch (error) {
        console.error('DEBUG: Profile PUT error:', error)
        return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 })
    }
})
