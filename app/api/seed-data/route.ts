import { NextResponse } from "next/server"
import { connectDB } from "@/lib/db/mongodb"
import Product from "@/lib/db/models/Product"
import Customer from "@/lib/db/models/Customer"
import Sale from "@/lib/db/models/Sale"
import mongoose from "mongoose"

export const dynamic = "force-dynamic"

export const POST = async () => {
    try {
        await connectDB()
        
        // ID de la empresa de prueba (debe existir en la base de datos)
        const companyId = new mongoose.Types.ObjectId("69addb81d19c9ae1b47ec22a")
        
        // Eliminar datos existentes de esta empresa
        await Product.deleteMany({ companyId })
        await Customer.deleteMany({ companyId })
        await Sale.deleteMany({ companyId })
        
        // Crear productos de ejemplo
        const products = await Product.insertMany([
            {
                companyId,
                sku: "PROD001",
                name: "Laptop Lenovo ThinkPad",
                description: "Laptop de 15 pulgadas para oficina",
                purchasePrice: 800000,
                salePrice: 1200000,
                stock: 15,
                minStock: 5,
                isActive: true
            },
            {
                companyId,
                sku: "PROD002",
                name: "Mouse Logitech MX Master",
                description: "Mouse inalámbrico ergonómico",
                purchasePrice: 150000,
                salePrice: 220000,
                stock: 3,
                minStock: 10,
                isActive: true
            },
            {
                companyId,
                sku: "PROD003",
                name: "Teclado Mecánico RGB",
                description: "Teclado mecánico con iluminación RGB",
                purchasePrice: 200000,
                salePrice: 350000,
                stock: 8,
                minStock: 5,
                isActive: true
            },
            {
                companyId,
                sku: "PROD004",
                name: "Monitor Dell 27\"",
                description: "Monitor IPS de 27 pulgadas 4K",
                purchasePrice: 1200000,
                salePrice: 1800000,
                stock: 2,
                minStock: 3,
                isActive: true
            },
            {
                companyId,
                sku: "PROD005",
                name: "Webcam HD 1080p",
                description: "Webcam de alta definición",
                purchasePrice: 80000,
                salePrice: 120000,
                stock: 25,
                minStock: 10,
                isActive: true
            }
        ])
        
        // Crear clientes de ejemplo
        const customers = await Customer.insertMany([
            {
                companyId,
                name: "Juan Pérez",
                email: "juan.perez@email.com",
                phone: "3001234567",
                address: "Calle 123 #45-67",
                isActive: true
            },
            {
                companyId,
                name: "María González",
                email: "maria.gonzalez@email.com",
                phone: "3009876543",
                address: "Avenida 78 #90-12",
                isActive: true
            },
            {
                companyId,
                name: "Carlos Rodríguez",
                email: "carlos.rodriguez@email.com",
                phone: "3005551234",
                address: "Carrera 45 #67-89",
                isActive: true
            }
        ])
        
        // Crear ventas de ejemplo
        const sales = await Sale.insertMany([
            {
                companyId,
                customer: customers[0]._id,
                items: [
                    {
                        product: products[0]._id,
                        quantity: 2,
                        price: 1200000,
                        subtotal: 2400000
                    }
                ],
                subtotal: 2400000,
                tax: 384000,
                total: 2784000,
                paymentMethod: "transfer",
                status: "completed"
            },
            {
                companyId,
                customer: customers[1]._id,
                items: [
                    {
                        product: products[1]._id,
                        quantity: 1,
                        price: 220000,
                        subtotal: 220000
                    },
                    {
                        product: products[2]._id,
                        quantity: 1,
                        price: 350000,
                        subtotal: 350000
                    }
                ],
                subtotal: 570000,
                tax: 91200,
                total: 661200,
                paymentMethod: "cash",
                status: "completed"
            },
            {
                companyId,
                customer: customers[2]._id,
                items: [
                    {
                        product: products[3]._id,
                        quantity: 1,
                        price: 1800000,
                        subtotal: 1800000
                    }
                ],
                subtotal: 1800000,
                tax: 288000,
                total: 2088000,
                paymentMethod: "card",
                status: "completed"
            }
        ])
        
        return NextResponse.json({
            success: true,
            message: "Datos de prueba creados exitosamente",
            data: {
                products: products.length,
                customers: customers.length,
                sales: sales.length
            }
        })
        
    } catch (error: any) {
        console.error("SEED DATA ERROR:", error)
        return NextResponse.json(
            { error: `Error creando datos de prueba: ${error.message}` },
            { status: 500 }
        )
    }
}
