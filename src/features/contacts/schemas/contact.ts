import { z } from "zod";
import { CONTACT_SOURCES, CONTACT_STATUSES } from "@/features/contacts/constants";

export const contactSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(60),
  lastName: z.string().min(1, "Last name is required").max(60),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(30).optional().or(z.literal("")),
  jobTitle: z.string().max(80).optional().or(z.literal("")),
  companyId: z.string().nullable().optional(),
  ownerId: z.string().optional(),
  status: z.enum(CONTACT_STATUSES).default("LEAD"),
  source: z.enum(CONTACT_SOURCES).default("OTHER"),
});

export type ContactInput = z.infer<typeof contactSchema>;
