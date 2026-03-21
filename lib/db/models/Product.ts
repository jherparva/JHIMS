import mongoose, { Schema, type Document } from "mongoose"

export interface IProduct extends Document {
    companyId: mongoose.Types.ObjectId
    sku: string
    name: string
    description?: string
    category: mongoose.Types.ObjectId
    purchasePrice: number
    salePrice: number
    stock: number
    minStock: number
    supplier?: mongoose.Types.ObjectId
    imageUrl?: string
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
    {
        companyId: {
            type: Schema.Types.ObjectId,
            ref: "Company",
            required: false,
            index: true,
        },
        sku: {
            type: String,
            required: [true, "El SKU es requerido"],
            trim: true,
            uppercase: true,
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
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "La categoría es requerida"],
        },
        purchasePrice: {
            type: Number,
            required: [true, "El precio de compra es requerido"],
            min: [0, "El precio de compra no puede ser negativo"],
        },
        salePrice: {
            type: Number,
            required: [true, "El precio de venta es requerido"],
            min: [0, "El precio de venta no puede ser negativo"],
        },
        stock: {
            type: Number,
            required: [true, "El stock es requerido"],
            min: [0, "El stock no puede ser negativo"],
            default: 0,
        },
        minStock: {
            type: Number,
            required: [true, "El stock mínimo es requerido"],
            min: [0, "El stock mínimo no puede ser negativo"],
            default: 5,
        },
        supplier: {
            type: Schema.Types.ObjectId,
            ref: "Supplier",
        },
        imageUrl: {
            type: String,
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
ProductSchema.index({ sku: 1 }, { unique: true })
ProductSchema.index({ name: "text" })
ProductSchema.index({ category: 1 })
ProductSchema.index({ stock: 1 })

// Método virtual para verificar bajo stock
ProductSchema.virtual("isLowStock").get(function () {
    return this.stock <= this.minStock
})

export default mongoose.models.Product || mongoose.model<IProduct>("Product", ProductSchema)
