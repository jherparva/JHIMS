import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "El nombre de la empresa es requerido").trim(),
  taxId: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  paymentQR: z.string().url("Debe ser una URL válida").or(z.literal("")).optional().nullable(),
  paymentInfo: z.string().max(300, "La información de pago es muy larga").optional().nullable().or(z.literal("")),
});

export type CompanyInput = z.infer<typeof companySchema>;
