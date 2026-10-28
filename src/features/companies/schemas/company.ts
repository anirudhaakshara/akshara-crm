import { z } from "zod";

export const companySchema = z.object({
  name: z.string().min(2, "Company name must be at least 2 characters").max(100),
  industry: z.string().min(2, "Industry is required").max(60),
  website: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  city: z.string().min(2, "City is required").max(60),
  phone: z.string().max(30).optional().or(z.literal("")),
  ownerId: z.string().min(1, "Owner is required").optional(),
});

export type CompanyInput = z.infer<typeof companySchema>;
