import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Kardex from "@/lib/db/models/Kardex"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (
    req: NextRequest,
    { params }: { params: { id: string } }
) => {
    try {
        await connectDB()

        const kardexEntries = await Kardex.find({
            productId: params.id
        })
        .sort({ date: -1 })
        .lean()

        return NextResponse.json({ kardexEntries })
    } catch (error: any) {
        console.error("Error fetching kardex:", error)
        return NextResponse.json(
            { error: "Error al obtener historial de movimientos" },
            { status: 500 }
        )
    }
})
