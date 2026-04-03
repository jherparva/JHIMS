import { z } from "zod";

/**
 * Esquema de validación para inicio de sesión
 */
export const loginSchema = z.object({
    username: z.string()
        .min(3, "El usuario debe tener al menos 3 caracteres")
        .max(20, "El usuario no puede exceder los 20 caracteres")
        .trim()
        .lowercase(),
    password: z.string()
        .min(8, "La contraseña debe tener al menos 8 caracteres"),
    rememberMe: z.boolean().optional().default(false),
});

/**
 * Esquema para recuperación de contraseña
 */
export const recuperarPasswordSchema = z.object({
    email: z.string().email("Debe ser un correo electrónico válido"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RecuperarPasswordInput = z.infer<typeof recuperarPasswordSchema>;
