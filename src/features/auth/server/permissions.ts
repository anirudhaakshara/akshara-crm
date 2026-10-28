import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { apiError } from "@/lib/api-response";
import prisma from "@/lib/prisma";

export interface AuthenticatedUser {
  id: string;
  name?: string | null;
  email?: string | null;
  role: "ADMIN" | "SALES_REP";
}

/**
 * Ensures user is authenticated. Throws 401 response if unauthenticated.
 */
export async function requireUser(): Promise<AuthenticatedUser> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw apiError("UNAUTHORIZED", "Authentication required to access this resource", 401);
  }
  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
  };
}

/**
 * Returns Prisma where filter based on user role:
 * ADMIN -> {} (can view all records)
 * SALES_REP -> { [field]: user.id } (only records they own)
 */
export function getOwnershipFilter(user: AuthenticatedUser, ownerField: string = "ownerId") {
  if (user.role === "ADMIN") {
    return {};
  }
  return { [ownerField]: user.id };
}

/**
 * Verifies if user can mutate/view a specific record by ownerId
 */
export function canAccessRecord(user: AuthenticatedUser, recordOwnerId: string): boolean {
  if (user.role === "ADMIN") return true;
  return recordOwnerId === user.id;
}

export interface LinkedRecordIds {
  contactId?: string | null;
  dealId?: string | null;
  companyId?: string | null;
}

/**
 * Verifies that every linked record exists and is accessible to the user.
 * Returns an error response to send back, or null when access is allowed.
 * SALES_REPs may only link records they own; ADMINs may link anything that exists.
 */
export async function checkLinkedAccess(
  user: AuthenticatedUser,
  ids: LinkedRecordIds
) {

  if (ids.contactId) {
    const contact = await prisma.contact.findUnique({
      where: { id: ids.contactId },
      select: { ownerId: true },
    });
    if (!contact) {
      return apiError("VALIDATION_ERROR", "Linked contact does not exist", 400, {
        contactId: ["Contact not found"],
      });
    }
    if (!canAccessRecord(user, contact.ownerId)) {
      return apiError("FORBIDDEN", "You do not have access to the linked contact", 403);
    }
  }

  if (ids.dealId) {
    const deal = await prisma.deal.findUnique({
      where: { id: ids.dealId },
      select: { ownerId: true },
    });
    if (!deal) {
      return apiError("VALIDATION_ERROR", "Linked deal does not exist", 400, {
        dealId: ["Deal not found"],
      });
    }
    if (!canAccessRecord(user, deal.ownerId)) {
      return apiError("FORBIDDEN", "You do not have access to the linked deal", 403);
    }
  }

  if (ids.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: ids.companyId },
      select: { ownerId: true },
    });
    if (!company) {
      return apiError("VALIDATION_ERROR", "Linked company does not exist", 400, {
        companyId: ["Company not found"],
      });
    }
    if (!canAccessRecord(user, company.ownerId)) {
      return apiError("FORBIDDEN", "You do not have access to the linked company", 403);
    }
  }

  return null;
}

/**
 * Verifies a user id exists (used when an ADMIN assigns an owner/assignee).
 */
export async function checkUserExists(userId: string, field: string) {
  const exists = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!exists) {
    return apiError("VALIDATION_ERROR", "Selected user does not exist", 400, {
      [field]: ["User not found"],
    });
  }
  return null;
}
