import mongoose, { Schema, type Document } from "mongoose"

export interface ICategory extends Document {
    companyId: mongoose.Types.ObjectId
    name: string
    description?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const CategorySchema = new Schema<ICategory>(
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
        description: {
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
CategorySchema.index({ name: 1, companyId: 1 }, { unique: true })

export default mongoose.models.Category || mongoose.model<ICategory>("Category", CategorySchema)
