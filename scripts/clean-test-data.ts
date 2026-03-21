import mongoose from "mongoose"
import { applyMultiTenancyPlugin } from "../lib/db/multi-tenancy-plugin"

// Aplicar plugin de multi-tenancy
applyMultiTenancyPlugin(mongoose)

// Importar modelos
import User from "../lib/db/models/User"
import Company from "../lib/db/models/Company"
import Product from "../lib/db/models/Product"
import Category from "../lib/db/models/Category"
import Supplier from "../lib/db/models/Supplier"
import Customer from "../lib/db/models/Customer"

const MONGODB_URI = "mongodb+srv://JHIMS:jherparva1990@jhims.afgjmlm.mongodb.net/jhims?retryWrites=true&w=majority"

async function cleanTestData() {
    try {
        console.log("🔌 Conectando a MongoDB Atlas...")
        await mongoose.connect(MONGODB_URI)
        console.log("✅ Conectado a MongoDB\n")

        // Buscar la compañía de prueba
        const testCompany = await Company.findOne({ slug: "test-company" })

        if (!testCompany) {
            console.log("ℹ️  No se encontró la compañía de prueba 'test-company'")
            console.log("No hay datos de prueba para eliminar.\n")
            await mongoose.disconnect()
            return
        }

        console.log("🔍 Compañía de prueba encontrada:", testCompany.name)
        console.log("ID:", testCompany._id)
        console.log("\n📊 Eliminando datos asociados...\n")

        // Eliminar productos de prueba
        const productsDeleted = await Product.deleteMany({ companyId: testCompany._id })
        console.log(`✅ Productos eliminados: ${productsDeleted.deletedCount}`)

        // Eliminar categorías de prueba
        const categoriesDeleted = await Category.deleteMany({ companyId: testCompany._id })
        console.log(`✅ Categorías eliminadas: ${categoriesDeleted.deletedCount}`)

        // Eliminar proveedores de prueba
        const suppliersDeleted = await Supplier.deleteMany({ companyId: testCompany._id })
        console.log(`✅ Proveedores eliminados: ${suppliersDeleted.deletedCount}`)

        // Eliminar clientes de prueba
        const customersDeleted = await Customer.deleteMany({ companyId: testCompany._id })
        console.log(`✅ Clientes eliminados: ${customersDeleted.deletedCount}`)

        // Eliminar usuarios de prueba
        const usersDeleted = await User.deleteMany({ companyId: testCompany._id })
            .setOptions({ skipTenantFilter: true })
        console.log(`✅ Usuarios eliminados: ${usersDeleted.deletedCount}`)

        // Eliminar la compañía de prueba
        await Company.deleteOne({ _id: testCompany._id })
        console.log(`✅ Compañía de prueba eliminada\n`)

        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.log("✅ Limpieza completada exitosamente")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

        await mongoose.disconnect()
        console.log("✅ Desconectado de MongoDB")

    } catch (error) {
        console.error("❌ Error durante la limpieza:", error)
        await mongoose.disconnect()
    } finally {
        process.exit(0)
    }
}

cleanTestData()
