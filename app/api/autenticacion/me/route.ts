import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
    try {
        const user = await getSession()

        if (!user) {
            return NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            )
        }

        return NextResponse.json({ user })
    } catch (error: any) {
        console.error("Error getting user session:", error)
        return NextResponse.json(
            { error: "Error al obtener sesión" },
            { status: 500 }
        )
    }
}
