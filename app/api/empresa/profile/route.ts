import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import User from "@/lib/db/models/User"
import Company from "@/lib/db/models/Company"
import { withSessionContext } from "@/lib/api-wrapper"

export const GET = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()

        // 1. Localizar al usuario real en la base de datos (usando skipTenantFilter para ser infalibles)
        const userInDb = await User.findById(context.userId).setOptions({ skipTenantFilter: true })

        if (!userInDb) {
            return NextResponse.json({ error: "Usuario no encontrado en la DB" }, { status: 404 })
        }

        // 2. Si no tiene empresa vinculada (o el contexto vino vacío), forzar vinculación o creación
        // PERO SOLO para usuarios que NO sean superadmin
        let finalCompanyId = userInDb.companyId

        if (!finalCompanyId && userInDb.role !== 'superadmin') {
            console.log(`REPARANDO: Usuario ${userInDb.username} sin empresa.`)
            // Buscar si existe alguna empresa
            let company = await Company.findOne({ isActive: true })

            if (!company) {
                console.log("Creando empresa de emergencia...")
                company = await Company.create({
                    slug: 'tienda-principal',
                    name: 'Mi Tienda JHIMS',
                    email: userInDb.email || 'admin@tienda.com',
                    status: 'active',
                    plan: 'free',
                    isActive: true,
                    limits: { maxUsers: 1, maxProducts: 100, maxSalesPerMonth: 50, maxStorageGB: 0.5 }
                })
            }

            // Vincular de forma permanente al usuario
            userInDb.companyId = company._id
            await userInDb.save()
            finalCompanyId = company._id
            console.log(`✅ REPARADO: Se vinculó permanentemente a ${company.name}`)
        }

        // El superadmin NUNCA debe tener empresa vinculada
        if (userInDb.role === 'superadmin') {
            finalCompanyId = undefined
            console.log(`REPARANDO: Usuario superadmin ${userInDb.username} - sin empresa por diseño`)
        }

        // 3. Obtener los datos con el ID ya asegurado
        const company = await Company.findById(finalCompanyId).lean()
        if (!company) {
            return NextResponse.json({ error: "Empresa no encontrada tras reparación" }, { status: 404 })
        }

        return NextResponse.json(company)
    } catch (error: any) {
        console.error('Company GET error brute force:', error)
        return NextResponse.json({ error: `Falla crítica: ${error.message}` }, { status: 500 })
    }
})

export const PUT = withSessionContext(async (req: NextRequest, context: any) => {
    try {
        await connectDB()
        const body = await req.json()
        const { name, taxId, address, phone } = body

        // 1. Obtener el companyId real desde el usuario en la DB (por si la sesión está mal)
        // PERO SOLO para usuarios que NO sean superadmin
        const userInDb = await User.findById(context.userId).setOptions({ skipTenantFilter: true })
        if (!userInDb || (!userInDb.companyId && userInDb.role !== 'superadmin')) {
            return NextResponse.json({ error: "No se encontró empresa vinculada al usuario para guardar" }, { status: 400 })
        }

        // El superadmin no puede actualizar empresas
        if (userInDb.role === 'superadmin') {
            return NextResponse.json({ error: "Los superadmins no pueden modificar empresas" }, { status: 403 })
        }

        const company = await Company.findByIdAndUpdate(
            userInDb.companyId,
            { name, taxId, address, phone },
            { new: true, runValidators: true }
        ).setOptions({ skipTenantFilter: true });

        return NextResponse.json(company)
    } catch (error: any) {
        console.error('Company PUT error brute force:', error)
        return NextResponse.json({ error: "Error al actualizar empresa" }, { status: 500 })
    }
})
