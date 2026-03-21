import mongoose, { Schema, type Document } from "mongoose"

export interface ITicket extends Document {
    companyId: mongoose.Types.ObjectId
    userId: mongoose.Types.ObjectId
    subject: string
    message: string
    status: "open" | "in_progress" | "resolved" | "closed"
    priority: "low" | "medium" | "high"
    response?: string
    respondedAt?: Date
    read?: boolean // Campo para marcar si la respuesta fue leída
    createdAt: Date
    updatedAt: Date
}

const TicketSchema = new Schema<ITicket>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
        },
        userId: {
            type: Schema.Types.ObjectId,
            // ref: "User", // Temporalmente comentado para evitar errores
            required: true,
        },
        subject: {
            type: String,
            required: [true, "El asunto es requerido"],
            trim: true,
        },
        message: {
            type: String,
            required: [true, "El mensaje es requerido"],
            trim: true,
        },
        status: {
            type: String,
            enum: ["open", "in_progress", "resolved", "closed"],
            default: "open",
        },
        priority: {
            type: String,
            enum: ["low", "medium", "high"],
            default: "medium",
        },
        response: {
            type: String,
        },
        read: {
            type: Boolean,
            default: false,
        },
        respondedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
)

export default mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema)
