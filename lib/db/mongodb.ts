import mongoose from "mongoose"
import { applyMultiTenancyPlugin } from "./multi-tenancy-plugin"

// Aplicar plugin de multi-tenancy globalmente
applyMultiTenancyPlugin(mongoose)
// Importar modelos para asegurar que estén registrados
// Nota: Comentados temporalmente hasta que se migren los modelos
import "@/lib/db/models/User"
import "@/lib/db/models/Category"
import "@/lib/db/models/Supplier"
import "@/lib/db/models/Product"
import "@/lib/db/models/Sale"
import "@/lib/db/models/Customer"
// import "@/lib/db/models/Purchase"
// import "@/lib/db/models/Expense"
import "@/lib/db/models/Company"
// import "@/lib/db/models/Invoice"
// import "@/lib/db/models/Payment"

if (!process.env.MONGODB_URI) {
    // throw new Error("Por favor define la variable de entorno MONGODB_URI en .env.local")
    console.warn("MONGODB_URI no definida")
}

const MONGODB_URI: string = process.env.MONGODB_URI || ""

interface MongooseCache {
    conn: typeof mongoose | null
    promise: Promise<typeof mongoose> | null
}

declare global {
    // eslint-disable-next-line no-var
    var myMongoose: MongooseCache | undefined
}

const cached: MongooseCache = global.myMongoose || { conn: null, promise: null }

if (!global.myMongoose) {
    global.myMongoose = cached
}

export async function connectDB(): Promise<typeof mongoose> {
    if (cached.conn) {
        return cached.conn
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        }

        console.log("📡 Intentando conectar a MongoDB con URI:", MONGODB_URI ? `${MONGODB_URI.substring(0, 20)}...` : "VACÍA")

        cached.promise = mongoose.connect(MONGODB_URI, opts).then((myMongoose) => {
            console.log("✅ Conexión exitosa a MongoDB:", myMongoose.connection.db?.databaseName)
            return myMongoose
        })
    }

    try {
        cached.conn = await cached.promise
        console.log("🏁 Base de Datos lista para operaciones")
    } catch (e: any) {
        cached.promise = null
        console.error("❌ Error conectando a MongoDB:", e)
        throw e
    }

    return cached.conn
}

export async function disconnectDB(): Promise<void> {
    if (cached.conn) {
        await cached.conn.disconnect()
        cached.conn = null
        cached.promise = null
        console.log("✅ Desconectado de MongoDB Atlas")
    }
}

export default connectDB
