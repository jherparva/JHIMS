import { z } from "zod";

export const categorySchema = z.object({
  name: z.string().min(2, "El nombre de la categoría debe tener al menos 2 caracteres").trim(),
  description: z.string().max(200, "Descripción muy larga").optional().default(""),
  isActive: z.boolean().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;
