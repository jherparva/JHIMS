import mongoose, { Schema, type Document } from "mongoose"

export interface INotification extends Document {
    userId: mongoose.Types.ObjectId
    companyId: mongoose.Types.ObjectId
    type: "ticket_response" | "low_stock" | "new_user" | "product_update" | "system_alert"
    title: string
    message: string
    read: boolean
    priority: "low" | "medium" | "high"
    data?: any // Datos adicionales según el tipo
    createdAt: Date
    updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
    {
        userId: {
            type: Schema.Types.ObjectId,
            // ref: "User", // Temporalmente comentado para evitar errores
            required: true,
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        type: {
            type: String,
            enum: ["ticket_response", "low_stock", "new_user", "product_update", "system_alert"],
            required: true,
        },
        title: {
            type: String,
            required: [true, "El título es requerido"],
            trim: true,
        },
        message: {
            type: String,
            required: [true, "El mensaje es requerido"],
            trim: true,
        },
        read: {
            type: Boolean,
            default: false,
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
        data: {
            type: Schema.Types.Mixed, // Datos adicionales según el tipo
        },
    },
    {
        timestamps: true,
    }
)

export default mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema)
