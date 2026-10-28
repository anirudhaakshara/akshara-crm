"use client";

import { useEffect, useState } from "react";
import { apiFetch, Paginated } from "@/lib/api-client";

export interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ContactOption {
  id: string;
  firstName: string;
  lastName: string;
  company: { id: string; name: string } | null;
}

export interface CompanyOption {
  id: string;
  name: string;
}

/** All users (for owner / assignee pickers). Only fetched when `enabled` (admins). */
export function useUserOptions(enabled: boolean) {
  const [users, setUsers] = useState<UserOption[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    apiFetch<{ users: UserOption[] }>("/api/users")
      .then((res) => active && setUsers(res.users))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [enabled]);
  return users;
}

/** Contacts visible to the current user, for pickers (server-scoped to ownership). */
export function useContactOptions(enabled: boolean = true) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    apiFetch<Paginated<ContactOption>>("/api/contacts?limit=100&sortBy=firstName&sortOrder=asc")
      .then((res) => active && setContacts(res.data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [enabled]);
  return contacts;
}

/** Companies visible to the current user, for pickers. */
export function useCompanyOptions(enabled: boolean = true) {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    apiFetch<Paginated<CompanyOption>>("/api/companies?limit=100&sortBy=name&sortOrder=asc")
      .then((res) => active && setCompanies(res.data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [enabled]);
  return companies;
}
