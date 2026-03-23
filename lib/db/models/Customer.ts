import mongoose, { Schema, type Document } from "mongoose"

export interface ICustomer extends Document {
    companyId: mongoose.Types.ObjectId
    name: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const CustomerSchema = new Schema<ICustomer>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: [true, "El nombre es requerido"],
            trim: true,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        taxId: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true,
    },
)

// Índices
CustomerSchema.index({ name: 1, companyId: 1 })
CustomerSchema.index({ email: 1, companyId: 1 })

export default mongoose.models.Customer || mongoose.model<ICustomer>("Customer", CustomerSchema)
