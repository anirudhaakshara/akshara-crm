import { z } from "zod";

export const USER_ROLES = ["ADMIN", "SALES_REP"] as const;
export type UserRoleValue = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRoleValue, string> = {
  ADMIN: "Admin",
  SALES_REP: "Sales rep",
};

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(120),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be at most 72 characters")
    .regex(/[A-Za-z]/, "Password must contain a letter")
    .regex(/[0-9]/, "Password must contain a number"),
  role: z.enum(USER_ROLES).default("SALES_REP"),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(USER_ROLES),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
