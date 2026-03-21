import mongoose, { Schema, type Document } from "mongoose"
import bcrypt from "bcryptjs"
import { multiTenancyPlugin } from "../multi-tenancy-plugin"

export interface IUser extends Document {
    username: string
    email: string
    password: string
    role: "admin" | "seller" | "superadmin" | "support"
    fullName: string
    phone?: string
    address?: string
    isActive: boolean
    permissions?: string[] // Permisos personalizados para vendedores
    companyId?: mongoose.Types.ObjectId // ID de la empresa (null para superadmin)
    sessionToken?: string // Token de sesión único para invalidar sesiones anteriores
    supportPermissions?: {
        canViewTickets: boolean
        canReplyTickets: boolean
        canCloseTickets: boolean
        canViewCompanies: boolean
        canApproveCompanies: boolean
        canRejectCompanies: boolean
        canChangePlans: boolean
        canSuspendCompanies: boolean
        canManageUsers: boolean
    }
    createdAt: Date
    lastLogin?: Date
    comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>(
    {
        username: {
            type: String,
            required: [true, "El nombre de usuario es requerido"],
            trim: true,
            lowercase: true,
        },
        email: {
            type: String,
            required: [true, "El email es requerido"],
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: [true, "La contraseña es requerida"],
            minlength: [8, "La contraseña debe tener al menos 8 caracteres"],
        },
        role: {
            type: String,
            enum: ["admin", "seller", "superadmin", "support"],
            default: "seller",
        },
        fullName: {
            type: String,
            required: [true, "El nombre completo es requerido"],
            trim: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogin: {
            type: Date,
        },
        sessionToken: {
            type: String,
            default: null,
        },
        permissions: {
            type: [String],
            default: [],
        },
        companyId: {
            type: Schema.Types.ObjectId,
            ref: 'Company',
            required: false, // No requerido para superadmin
        },
        supportPermissions: {
            canViewTickets: { type: Boolean, default: true },
            canReplyTickets: { type: Boolean, default: true },
            canCloseTickets: { type: Boolean, default: false },
            canViewCompanies: { type: Boolean, default: false },
            canApproveCompanies: { type: Boolean, default: false },
            canRejectCompanies: { type: Boolean, default: false },
            canChangePlans: { type: Boolean, default: false },
            canSuspendCompanies: { type: Boolean, default: false },
            canManageUsers: { type: Boolean, default: false },
        },
    },
    {
        timestamps: true,
    },
)

// Aplicar plugin explícitamente para evitar problemas de orden de importación
UserSchema.plugin(multiTenancyPlugin)

// Índices (username y email ya tienen unique:true, no necesitan schema.index adicional)
UserSchema.index({ role: 1 })

// Hash password antes de guardar
UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next()

    try {
        const salt = await bcrypt.genSalt(10)
        this.password = await bcrypt.hash(this.password, salt)
        next()
    } catch (error: unknown) {
        next(error as Error)
    }
})

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password)
}

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
