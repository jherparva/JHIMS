import { connectDB } from "../lib/db/mongodb"
import User from "../lib/db/models/User"
import Company from "../lib/db/models/Company"
import bcrypt from "bcryptjs"

async function createTestUser() {
    try {
        await connectDB()
        console.log("✅ Conectado a MongoDB")

        // Buscar o crear una compañía de prueba
        let company = await Company.findOne({ slug: "test-company" })

        if (!company) {
            company = await Company.create({
                name: "Empresa de Prueba",
                slug: "test-company",
                email: "test@company.com",
                plan: "gratis",
                status: "active",
                limits: {
                    maxUsers: 5,
                    maxProducts: 100,
                    maxSalesPerMonth: 50,
                    maxStorageGB: 1
                },
                usage: {
                    currentUsers: 0,
                    currentProducts: 0,
                    currentSalesThisMonth: 0,
                    currentStorageGB: 0
                }
            })
            console.log("✅ Compañía de prueba creada")
        }

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username: "admin" })
            .setOptions({ skipTenantFilter: true })

        if (existingUser) {
            console.log("⚠️  El usuario 'admin' ya existe")
            console.log("Usuario:", existingUser.username)
            console.log("Email:", existingUser.email)
            console.log("Rol:", existingUser.role)
            return
        }

        // Crear usuario de prueba
        const hashedPassword = await bcrypt.hash("admin123", 10)

        const user = await User.create({
            username: "admin",
            email: "admin@test.com",
            password: hashedPassword,
            fullName: "Administrador de Prueba",
            role: "admin",
            companyId: company._id,
            isActive: true
        })

        console.log("\n✅ Usuario de prueba creado exitosamente!")
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        console.log("Usuario:", user.username)
        console.log("Contraseña: admin123")
        console.log("Email:", user.email)
        console.log("Rol:", user.role)
        console.log("Compañía:", company.name)
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")

    } catch (error) {
        console.error("❌ Error:", error)
    } finally {
        process.exit(0)
    }
}

createTestUser()
