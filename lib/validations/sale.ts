import { z } from "zod";

/**
 * Esquema de validación para items de venta (Compatible con el Frontend)
 */
export const saleItemSchema = z.object({
  product: z.object({
    _id: z.string().min(24, "ID de producto inválido"),
    name: z.string().optional(),
    salePrice: z.number().optional(),
  }),
  variantId: z.string().optional().nullable(),
  variantName: z.string().optional().nullable(),
  variantPrice: z.number().optional().nullable(),
  quantity: z.number().int().positive("La cantidad debe ser mayor a 0"),
});

/**
 * Esquema de validación para creación de ventas
 */
export const createSaleSchema = z.object({
  customer: z.string().optional().nullable(),
  items: z.array(saleItemSchema).min(1, "La venta debe tener al menos un producto"),
  total: z.number().nonnegative(),
  paymentMethod: z.enum(["cash", "card", "transfer", "credit"]),
  amountPaid: z.union([z.number(), z.string()]).transform((val) => Number(val)).default(0),
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type SaleItemInput = z.infer<typeof saleItemSchema>;
