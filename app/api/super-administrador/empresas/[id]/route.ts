import { NextRequest, NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Company from "@/lib/db/models/Company"
import Category from "@/lib/db/models/Category"
import { getSession } from "@/lib/auth"
import Product from "@/lib/db/models/Product"
import { runWithSession } from "@/lib/session-context"

const DEFAULT_CATEGORIES: Record<string, string[]> = {
    tienda: [
        "Abarrotes", "Lácteos y Huevos", "Carnes y Embutidos", "Bebidas y Jugos", 
        "Licores y Cervezas", "Aseo Personal", "Aseo del Hogar", "Dulcería y Snacks", 
        "Panadería", "Desechables", "Frutas y Verduras", "Mascotas", "Medicamentos Básicos", "Mecato Colombiano", "Otros"
    ],
    ferreteria: [
        "Herramientas Manuales", "Herramientas Eléctricas", "Pinturas y Solventes", 
        "Plomería y Tuberías", "Material Eléctrico", "Tornillería y Clavos", 
        "Materiales de Construcción", "Cerrajería", "Adhesivos y Pegantes", "Abrasivos", "Madera y Tableros", "Otros"
    ],
    restaurante: [
        "Entradas", "Sopas y Cremas", "Platos Fuertes", "Comida Rápida", 
        "Bebidas Frias", "Bebidas Calientes", "Postres", "Licores y Cócteles", 
        "Menú Infantil", "Adiciones y Extras", "Desayunos", "Otros"
    ],
    otro: ["General", "Servicios", "Productos", "Insumos", "Otros"]
}

const DEFAULT_PRODUCTS: Record<string, {name: string; cat: string}[]> = {
    tienda: [
        { name: "Arroz Roa 500g", cat: "Abarrotes" },
        { name: "Arroz Diana 500g", cat: "Abarrotes" },
        { name: "Aceite Gourmet 1000ml", cat: "Abarrotes" },
        { name: "Panela Cuadrada", cat: "Abarrotes" },
        { name: "Azúcar Manuelita 1kg", cat: "Abarrotes" },
        { name: "Sal Refisal 1kg", cat: "Abarrotes" },
        { name: "Café Sello Rojo 250g", cat: "Abarrotes" },
        { name: "Huevos Tipo A x 30", cat: "Lácteos y Huevos" },
        { name: "Leche Alquería Entera 1L", cat: "Lácteos y Huevos" },
        { name: "Leche Colanta Entera 1L", cat: "Lácteos y Huevos" },
        { name: "Queso Campesino", cat: "Lácteos y Huevos" },
        { name: "Mantequilla Rama", cat: "Lácteos y Huevos" },
        { name: "Salchicha Ranchera", cat: "Carnes y Embutidos" },
        { name: "Chorizo Santarrosano", cat: "Carnes y Embutidos" },
        { name: "Mortadela Tradicional", cat: "Carnes y Embutidos" },
        { name: "Gaseosa Coca-Cola 350ml", cat: "Bebidas y Jugos" },
        { name: "Gaseosa Postobón Manzana 350ml", cat: "Bebidas y Jugos" },
        { name: "Jugo Hit Mora", cat: "Bebidas y Jugos" },
        { name: "Pony Malta", cat: "Bebidas y Jugos" },
        { name: "Agua Cristal 600ml", cat: "Bebidas y Jugos" },
        { name: "Cerveza Poker Lata", cat: "Licores y Cervezas" },
        { name: "Cerveza Aguila Lata", cat: "Licores y Cervezas" },
        { name: "Cerveza Club Colombia Gold", cat: "Licores y Cervezas" },
        { name: "Crema Dental Colgate", cat: "Aseo Personal" },
        { name: "Papel Higiénico Familia", cat: "Aseo Personal" },
        { name: "Jabón Rey", cat: "Aseo del Hogar" },
        { name: "Detergente Ariel", cat: "Aseo del Hogar" },
        { name: "Limpiador Fabuloso", cat: "Aseo del Hogar" },
        { name: "Chocoramo", cat: "Dulcería y Snacks" },
        { name: "Papas Margarita Pollo", cat: "Dulcería y Snacks" },
        { name: "Papas Margarita Limón", cat: "Dulcería y Snacks" },
        { name: "Detodito Mix", cat: "Dulcería y Snacks" },
        { name: "Bombonbum", cat: "Dulcería y Snacks" },
        { name: "Galletas Festival", cat: "Dulcería y Snacks" },
        { name: "Galletas Saltín Noel", cat: "Dulcería y Snacks" }
    ],
    ferreteria: [
        { name: "Martillo Goma", cat: "Herramientas Manuales" },
        { name: "Destornillador Estrella", cat: "Herramientas Manuales" },
        { name: "Destornillador Pala", cat: "Herramientas Manuales" },
        { name: "Cinta de Enmascarar", cat: "Adhesivos y Pegantes" },
        { name: "Cinta Aislante Negra", cat: "Material Eléctrico" },
        { name: "Pintura Viniltex Blanco 1 Galón", cat: "Pinturas y Solventes" },
        { name: "Thinner Corriente", cat: "Pinturas y Solventes" },
        { name: "Tubo PVC Presión 1/2", cat: "Plomería y Tuberías" },
        { name: "Pegante PVC", cat: "Adhesivos y Pegantes" },
        { name: "Clavos Con Cabeza", cat: "Tornillería y Clavos" },
        { name: "Tornillo Goloso", cat: "Tornillería y Clavos" },
        { name: "Bombillo LED 9W", cat: "Material Eléctrico" },
        { name: "Tomacorriente Doble", cat: "Material Eléctrico" },
        { name: "Interruptor Sencillo", cat: "Material Eléctrico" },
        { name: "Cemento Argos 50kg", cat: "Materiales de Construcción" }
    ],
    restaurante: [
        { name: "Empanada de Carne", cat: "Entradas" },
        { name: "Arepa de Choclo", cat: "Entradas" },
        { name: "Patacón con Hogao", cat: "Entradas" },
        { name: "Sancocho Trifásico", cat: "Sopas y Cremas" },
        { name: "Ajiaco Santafereño", cat: "Sopas y Cremas" },
        { name: "Bandeja Paisa", cat: "Platos Fuertes" },
        { name: "Churrasco", cat: "Platos Fuertes" },
        { name: "Pechuga a la Plancha", cat: "Platos Fuertes" },
        { name: "Mojarra Frita", cat: "Platos Fuertes" },
        { name: "Hamburguesa Sencilla", cat: "Comida Rápida" },
        { name: "Hamburguesa Especial", cat: "Comida Rápida" },
        { name: "Perro Caliente", cat: "Comida Rápida" },
        { name: "Jugo Natural en Agua", cat: "Bebidas Frias" },
        { name: "Jugo Natural en Leche", cat: "Bebidas Frias" },
        { name: "Limonada Natural", cat: "Bebidas Frias" },
        { name: "Gaseosa Envase 350ml", cat: "Bebidas Frias" },
        { name: "Cerveza Nacional", cat: "Licores y Cócteles" },
        { name: "Tinto", cat: "Bebidas Calientes" },
        { name: "Chocolate", cat: "Bebidas Calientes" },
        { name: "Arroz con Leche", cat: "Postres" },
        { name: "Adición de Papas a la Francesa", cat: "Adiciones y Extras" }
    ]
}

export const dynamic = "force-dynamic"

async function verifySuperAdmin() {
    const user = await getSession()
    if (!user || user.role !== "superadmin") return null
    return user
}

// PATCH: Cambiar estado de una empresa (activar/suspender/cancelar)
export async function PATCH(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    // Usar runWithSession para que el plugin de multi-tenancy no bloquee las consultas del superadmin
    return runWithSession({ role: 'superadmin', userId: user.id }, async () => {
        try {
            await connectDB()
            const { status, plan, businessType, initCategories } = await req.json()

            const company = await Company.findById(params.id)
            if (!company) {
                return NextResponse.json({ error: "Empresa no encontrada" }, { status: 404 })
            }

            if (status) company.status = status
            if (businessType) {
                company.businessType = businessType
            }
            
            if (plan && plan !== company.plan) {
                company.plan = plan
                // Actualizar límites automáticos según el nuevo plan
                const { PLANS } = await import("@/lib/db/models/Company")
                const planConfig = PLANS[plan]
                if (planConfig) {
                    company.limits = planConfig.limits
                }
            }

            await company.save()

            // Lógica de generación manual de categorías
            if (initCategories) {
                const bType = businessType || company.businessType || 'tienda'
                const defaultCats = DEFAULT_CATEGORIES[bType] || DEFAULT_CATEGORIES.tienda
                
                // ELIMINAR CATEGORÍAS Y PRODUCTOS PREVIAMENTE GENERADOS AUTOMÁTICAMENTE
                // Esto cumple con el requerimiento de "si se cambia de tienda a ferretería también se cambiarán todo lo que se genera automáticamente"
                await Product.deleteMany({ 
                    companyId: params.id, 
                    description: { $regex: /^Generado automáticamente/ } 
                })
                await Category.deleteMany({ 
                    companyId: params.id, 
                    description: { $regex: /^Generado automáticamente/ } 
                })

                // Verificamos cuáles ya existen (en caso de que el usuario haya creado manualmente algunas con el mismo nombre)
                const existingCats = await Category.find({ 
                    companyId: params.id,
                    name: { $in: defaultCats }
                }).select('name')
                
                const existingNames = existingCats.map(c => c.name)
                const catsToInsert = defaultCats.filter(name => !existingNames.includes(name))
                
                if (catsToInsert.length > 0) {
                    await Category.insertMany(
                        catsToInsert.map(catName => ({
                            companyId: params.id,
                            name: catName,
                            description: `Generado automáticamente - ${bType}`,
                            isActive: true
                        }))
                    )
                }

                // Mapear todas las categorías (las nuevas y las existentes)
                const allCats = await Category.find({ 
                    companyId: params.id,
                    name: { $in: defaultCats }
                }).select('name _id')

                const catMap = allCats.reduce((acc, cat) => {
                    acc[cat.name] = cat._id
                    return acc
                }, {} as Record<string, any>)

                // CREAR INVENTARIO POR DEFECTO
                const defaultProds = DEFAULT_PRODUCTS[bType] || DEFAULT_PRODUCTS.tienda
                
                // Verificar qué productos ya existen para no duplicar (por nombre)
                const existingProds = await Product.find({
                    companyId: params.id,
                    name: { $in: defaultProds.map(p => p.name) }
                }).select('name')
                
                const existingProdNames = existingProds.map(p => p.name)
                const prodsToInsert = defaultProds.filter(prod => !existingProdNames.includes(prod.name))

                if (prodsToInsert.length > 0) {
                    let skuCounter = 1;
                    const newProducts = prodsToInsert.map(prod => {
                        const catId = catMap[prod.cat] || (allCats.length > 0 ? allCats[0]._id : null)
                        
                        // Si por algún motivo no hay categorías, no podemos insertar productos (ya que la categoría es requerida)
                        if (!catId) return null;

                        const paddedSku = skuCounter.toString().padStart(4, '0')
                        skuCounter++
                        
                        return {
                            companyId: params.id,
                            name: prod.name,
                            description: `Generado automáticamente - ${bType}`,
                            sku: `SKU-${bType.substring(0,3).toUpperCase()}-${Date.now().toString().substring(7)}-${paddedSku}`, 
                            category: catId,
                            purchasePrice: 0,
                            salePrice: 0,
                            stock: 0,
                            minStock: 5,
                            isActive: true
                        }
                    }).filter(p => p !== null)
                    
                    if (newProducts.length > 0) {
                        await Product.insertMany(newProducts)
                    }
                }
            }

            return NextResponse.json({ success: true, company })
        } catch (error: any) {
            console.error("UPDATE COMPANY ERROR:", error)
            return NextResponse.json({ error: "Error al actualizar empresa: " + error.message }, { status: 500 })
        }
    })
}

// DELETE: Eliminar empresa (irreversible)
export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const user = await verifySuperAdmin()
    if (!user) {
        return NextResponse.json({ error: "Acceso denegado. Solo superadmin." }, { status: 403 })
    }

    return runWithSession({ role: 'superadmin', userId: user.id }, async () => {
        try {
            await connectDB()
            
            // Importar modelos para borrado en cascada
            const [UserModel, CategoryModel, ProductModel, CustomerModel, SupplierModel, SaleModel, TicketModel] = await Promise.all([
                import("@/lib/db/models/User").then(m => m.default),
                import("@/lib/db/models/Category").then(m => m.default),
                import("@/lib/db/models/Product").then(m => m.default),
                import("@/lib/db/models/Customer").then(m => m.default),
                import("@/lib/db/models/Supplier").then(m => m.default),
                import("@/lib/db/models/Sale").then(m => m.default),
                import("@/lib/db/models/Ticket").then(m => m.default)
            ]);

            // Borrar todos los documentos asociados a esta empresa
            // Nota: El plugin de multi-tenancy podría bloquear estos deleteMany si no hay contexto
            await Promise.all([
                UserModel.deleteMany({ companyId: params.id, role: { $ne: 'superadmin' } }),
                CategoryModel.deleteMany({ companyId: params.id }),
                ProductModel.deleteMany({ companyId: params.id }),
                CustomerModel.deleteMany({ companyId: params.id }),
                SupplierModel.deleteMany({ companyId: params.id }),
                SaleModel.deleteMany({ companyId: params.id }),
                TicketModel.deleteMany({ companyId: params.id }),
                Company.findByIdAndDelete(params.id)
            ]);
            
            return NextResponse.json({ success: true })
        } catch (error: any) {
            console.error("DELETE COMPANY ERROR:", error)
            return NextResponse.json({ error: "Error al eliminar empresa: " + error.message }, { status: 500 })
        }
    })
}
