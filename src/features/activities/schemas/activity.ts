import { z } from "zod";

export const activitySchema = z.object({
  type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE"]),
  subject: z.string().min(2, "Subject is required").max(120),
  description: z.string().max(2000).optional().or(z.literal("")),
  occurredAt: z.string().datetime().optional(),
  contactId: z.string().nullable().optional(),
  dealId: z.string().nullable().optional(),
});

export type ActivityInput = z.infer<typeof activitySchema>;
