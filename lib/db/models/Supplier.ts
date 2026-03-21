import mongoose, { Schema, type Document } from "mongoose"

export interface ISupplier extends Document {
    companyId: mongoose.Types.ObjectId
    name: string
    contactName?: string
    email?: string
    phone?: string
    address?: string
    taxId?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const SupplierSchema = new Schema<ISupplier>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: false,
            index: true,
        },
        name: {
            type: String,
            required: [true, "El nombre es requerido"],
            trim: true,
        },
        contactName: {
            type: String,
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
SupplierSchema.index({ name: 1, companyId: 1 })

export default mongoose.models.Supplier || mongoose.model<ISupplier>("Supplier", SupplierSchema)
