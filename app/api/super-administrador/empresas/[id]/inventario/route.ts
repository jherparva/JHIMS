import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import { withSessionContext } from "@/lib/api-wrapper"
import { processInventoryImport } from "@/lib/db/utils/import-wizard"

export const dynamic = "force-dynamic"

/**
 * API para importar inventario masivo vía Excel para una empresa específica
 * Solo accesible por SuperAdmin
 */
export const POST = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        // 1. Verificar Permisos (Solo SuperAdmin)
        if (context.role !== 'superadmin') {
            return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 })
        }

        // 2. Obtener CompanyId del URL
        const url = new URL(req.url)
        const parts = url.pathname.split('/')
        const companyId = parts[parts.length - 2] // Format: /api/super-administrador/empresas/[id]/inventario

        if (!companyId) {
            return NextResponse.json({ error: "ID de empresa no proporcionado" }, { status: 400 })
        }

        // 3. Procesar el archivo
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 })
        }

        const buffer = Buffer.from(await file.arrayBuffer())
        const result = await processInventoryImport(companyId, buffer)

        if (!result.success) {
            return NextResponse.json({ error: result.message }, { status: 400 })
        }

        return NextResponse.json({ 
            message: "Inventario importado con éxito",
            details: result.details 
        })

    } catch (error: any) {
        console.error("IMPORT ERROR:", error)
        return NextResponse.json(
            { error: `Error en importación: ${error.message}` },
            { status: 500 }
        )
    }
})
