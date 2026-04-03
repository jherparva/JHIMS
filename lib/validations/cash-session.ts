import { z } from "zod";

export const openCashSessionSchema = z.object({
  openingAmount: z.number().nonnegative("El monto de apertura no puede ser negativo").default(0),
});

export const closeCashSessionSchema = z.object({
  closingAmount: z.number().nonnegative("El monto de cierre no puede ser negativo"),
  notes: z.string().max(300, "La nota es demasiado larga").optional().default(""),
});

export type OpenCashSessionInput = z.infer<typeof openCashSessionSchema>;
export type CloseCashSessionInput = z.infer<typeof closeCashSessionSchema>;
