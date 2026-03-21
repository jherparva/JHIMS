import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import mongoose from "mongoose"

export const dynamic = "force-dynamic"

export const GET = async () => {
    try {
        await connectDB()
        
        // Verificar conexión
        const db = mongoose.connection.db
        if (!db) {
            return NextResponse.json({ error: "No hay conexión a la base de datos" }, { status: 500 })
        }
        
        // Listar colecciones
        const collections = await db.listCollections().toArray()
        
        // Contar documentos en cada colección
        const stats: any = {}
        for (const collection of collections) {
            const count = await db.collection(collection.name).countDocuments()
            stats[collection.name] = count
        }
        
        return NextResponse.json({
            connected: true,
            database: db.databaseName,
            collections: stats,
            timestamp: new Date().toISOString()
        })
        
    } catch (error: any) {
        console.error("TEST DB ERROR:", error)
        return NextResponse.json(
            { error: `Error de conexión: ${error.message}` },
            { status: 500 }
        )
    }
}
