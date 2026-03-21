import { connectDB } from "@/lib/db/mongodb"
import Notification from "@/lib/db/models/Notification"
import Product from "@/lib/db/models/Product"
import User from "@/lib/db/models/User"

export class NotificationService {
    /**
     * Crear notificación de respuesta de ticket
     */
    static async createTicketResponseNotification(userId: string, companyId: string, ticketSubject: string, response: string) {
        await connectDB()
        
        await Notification.create({
            userId,
            companyId,
            type: "ticket_response",
            title: "🎫 Respuesta a tu ticket",
            message: `El superadmin ha respondido a tu ticket "${ticketSubject}".\n\nRespuesta: "${response.substring(0, 100)}${response.length > 100 ? '...' : ''}"`,
            priority: "medium",
            data: {
                ticketSubject,
                response,
                ticketId: response // Aquí iría el ID del ticket
            }
        })

        console.log(`✅ Notificación de respuesta de ticket creada para usuario: ${userId}`)
    }

    /**
     * Crear notificación de stock bajo
     */
    static async createLowStockNotification(userId: string, companyId: string, productName: string, currentStock: number, minStock: number) {
        await connectDB()
        
        await Notification.create({
            userId,
            companyId,
            type: "low_stock",
            title: "⚠️ Stock Bajo",
            message: `El producto "${productName}" tiene stock bajo. Actual: ${currentStock} unidades, mínimo recomendado: ${minStock} unidades.`,
            priority: "high",
            data: {
                productName,
                currentStock,
                minStock,
                productId: productName // Aquí iría el ID del producto
            }
        })

        console.log(`⚠️ Notificación de stock bajo creada para usuario: ${userId}`)
    }

    /**
     * Crear notificación de nuevo usuario
     */
    static async createNewUserNotification(userId: string, companyId: string, newUserEmail: string, newUserRole: string) {
        await connectDB()
        
        await Notification.create({
            userId,
            companyId,
            type: "new_user",
            title: "👤 Nuevo Usuario Creado",
            message: `Se ha creado un nuevo usuario en tu empresa: ${newUserEmail} con rol: ${newUserRole}.`,
            priority: "medium",
            data: {
                newUserEmail,
                newUserRole
            }
        })

        console.log(`👤 Notificación de nuevo usuario creada para usuario: ${userId}`)
    }

    /**
     * Crear notificación de actualización de producto
     */
    static async createProductUpdateNotification(userId: string, companyId: string, productName: string, updateType: string) {
        await connectDB()
        
        await Notification.create({
            userId,
            companyId,
            type: "product_update",
            title: "📦 Producto Actualizado",
            message: `El producto "${productName}" ha sido actualizado: ${updateType}`,
            priority: "low",
            data: {
                productName,
                updateType
            }
        })

        console.log(`📦 Notificación de actualización de producto creada para usuario: ${userId}`)
    }

    /**
     * Crear notificación de alerta del sistema
     */
    static async createSystemAlertNotification(userId: string, companyId: string, alertTitle: string, alertMessage: string, priority: "low" | "medium" | "high" = "medium") {
        await connectDB()
        
        await Notification.create({
            userId,
            companyId,
            type: "system_alert",
            title: `🚨 ${alertTitle}`,
            message: alertMessage,
            priority,
            data: {
                alertType: alertTitle
            }
        })

        console.log(`🚨 Notificación de alerta del sistema creada para usuario: ${userId}`)
    }

    /**
     * Enviar notificación a todos los usuarios de una empresa
     */
    static async createCompanyWideNotification(companyId: string, title: string, message: string, type: string, priority: "low" | "medium" | "high" = "medium", data?: any) {
        await connectDB()
        
        const User = require('../db/models/User').default
        
        // Obtener todos los usuarios activos de la empresa
        const users = await User.find({ 
            companyId, 
            isActive: true 
        }).select('_id')
        
        // Crear notificación para cada usuario
        const notifications = users.map((user: any) => ({
            userId: user._id,
            companyId,
            type,
            title,
            message,
            priority,
            data: data || {}
        }))

        await Notification.insertMany(notifications)

        console.log(`📢 Notificación empresa-wide creada para ${users.length} usuarios de la empresa ${companyId}`)
    }

    /**
     * Crear notificación genérica
     */
    static async createNotification(userId: string, companyId: string, type: string, title: string, message: string, priority: "low" | "medium" | "high" = "medium", data?: any) {
        await connectDB()
        
        await Notification.create({
            userId,
            companyId,
            type,
            title,
            message,
            priority,
            data: data || {}
        })

        console.log(`✅ Notificación genérica creada para usuario: ${userId}`)
    }
}
