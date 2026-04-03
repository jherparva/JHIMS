import { z } from "zod";

export const supplierSchema = z.object({
  name: z.string().min(2, "El nombre del proveedor es requerido").trim(),
  contactName: z.string().optional().nullable().or(z.literal("")),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
  taxId: z.string().optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
  companyId: z.string().optional(),
});

export type SupplierInput = z.infer<typeof supplierSchema>;
