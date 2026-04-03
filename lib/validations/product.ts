import { z } from "zod";

/**
 * Esquema de validación para creación y actualización de productos
 */
export const productSchema = z.object({
    name: z.string()
        .min(2, "El nombre del producto debe tener al menos 2 caracteres")
        .max(100, "El nombre del producto no puede exceder los 100 caracteres")
        .trim(),
    sku: z.string()
        .min(3, "El SKU debe tener al menos 3 caracteres")
        .max(30, "El SKU no puede exceder los 30 caracteres")
        .trim()
        .toUpperCase(),
    categoryId: z.string().nullable().optional(),
    supplierId: z.string().nullable().optional(),
    costPrice: z.number()
        .nonnegative("El precio de costo no puede ser negativo")
        .default(0),
    salePrice: z.number()
        .positive("El precio de venta debe ser comercial (mayor a 0)"),
    stock: z.number()
        .int("El stock debe ser un número entero")
        .default(0),
    minStock: z.number()
        .int("El stock mínimo debe ser un número entero")
        .nonnegative("El stock mínimo no puede ser negativo")
        .default(0),
    description: z.string().max(500, "La descripción es demasiado larga").optional(),
    imageUrl: z.string().url("Debe ser una URL válida").or(z.literal("")).optional().nullable(),
    hasVariants: z.boolean().default(false),
    variants: z.array(z.object({
        _id: z.string().optional(),
        name: z.string().min(1, "Nombre de variante requerido"),
        sku: z.string().optional(),
        salePrice: z.number().nonnegative(),
        stock: z.number().int().default(0),
    })).optional().default([]),
});

export type ProductInput = z.infer<typeof productSchema>;
