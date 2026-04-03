import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres").trim(),
  email: z.string().email("Email inválido").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  address: z.string().optional().nullable().or(z.literal("")),
  taxId: z.string().optional().nullable().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;
