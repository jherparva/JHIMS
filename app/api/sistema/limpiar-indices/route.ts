import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectDB } from '@/lib/db/mongodb'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de mantenimiento para borrar índices antiguos que causan conflictos de duplicados.
 */
export async function GET() {
    try {
        // Solo permitir a superadmin
        const session = await getSession()
        if (!session || session.role !== 'superadmin') {
            return NextResponse.json({ error: 'Solo para superadmin' }, { status: 401 })
        }

        await connectDB()
        const db = mongoose.connection.db
        const collection = db.collection('products')

        // 1. Ver índices actuales
        const indexes = await collection.indexes()
        const indexNames = indexes.map(idx => idx.name)
        console.log('Índices en products:', indexNames)

        let report = {
            before: indexNames,
            action: 'Búsqueda de índice sku_1',
            status: 'Ninguna acción necesaria'
        }

        // 2. Borrar el índice antiguo si existe
        if (indexNames.includes('sku_1')) {
            console.log('🗑️ Borrando índice antiguo sku_1...')
            await collection.dropIndex('sku_1')
            report.status = 'Índice sku_1 borrado con éxito'
        }

        return NextResponse.json({ 
            message: 'Limpieza de base de datos finalizada',
            report 
        })
    } catch (error: any) {
        console.error('Error en limpieza de base de datos:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
