import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        // Validar companyId del contexto
        if (!context.companyId) {
            console.error("USERS API: No companyId in context")
            return NextResponse.json({ error: "Falta companyId" }, { status: 400 })
        }

        const compId = context.companyId
        console.log("USERS API: Fetching users for company:", compId)

        // Filtrar usuarios por empresa (CORREGIDO)
        const users = await User.find({ 
            companyId: compId, 
            isActive: true 
        })
            .select("-password")
            .sort({ createdAt: -1 })
            .lean()

        console.log(`USERS API: Found ${users.length} users for company ${compId}`)

        return NextResponse.json(users)
    } catch (error: any) {
        console.error("Error fetching users:", error)
        return NextResponse.json(
            { error: "Error al obtener usuarios" },
            { status: 500 }
        )
    }
})

export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        const body = await req.json()
        const { fullName, username, email, password, role, permissions } = body

        if (!fullName || !username || !email || !password) {
            return NextResponse.json(
                { error: "Todos los campos son requeridos" },
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

        const user = await User.create({
            fullName,
            username,
            email,
            password,
            role: role || "seller",
            permissions: role === "seller" ? (permissions || []) : [],
            // ✅ Heredar la empresa del admin que está creando este usuario
            // Esto garantiza que el vendedor comparte el mismo inventario, ventas y reportes
            companyId: context.companyId,
        })

        const userResponse = user.toObject()
        delete userResponse.password

        return NextResponse.json(userResponse, { status: 201 })
    } catch (error: any) {
        console.error("Error creating user:", error)
        return NextResponse.json(
            { error: "Error al crear usuario" },
            { status: 500 }
        )
    }
})
