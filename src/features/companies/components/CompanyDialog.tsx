"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, X } from "lucide-react";

interface CompanyData {
  id?: string;
  name: string;
  industry: string;
  website?: string | null;
  city: string;
  phone?: string | null;
  ownerId?: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface CompanyDialogProps {
  open: boolean;
  initialData?: CompanyData | null;
  users?: UserOption[];
  isAdmin?: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function CompanyDialog({
  open,
  initialData,
  users = [],
  isAdmin = false,
  onClose,
  onSaved,
}: CompanyDialogProps) {
  const isEditing = !!initialData?.id;

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [website, setWebsite] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || "");
      setIndustry(initialData.industry || "");
      setWebsite(initialData.website || "");
      setCity(initialData.city || "");
      setPhone(initialData.phone || "");
      setOwnerId(initialData.ownerId || "");
    } else {
      setName("");
      setIndustry("");
      setWebsite("");
      setCity("");
      setPhone("");
      setOwnerId("");
    }
    setError(null);
  }, [initialData, open]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const payload = {
      name: name.trim(),
      industry: industry.trim(),
      website: website.trim() || undefined,
      city: city.trim(),
      phone: phone.trim() || undefined,
      ...(isAdmin && ownerId ? { ownerId } : {}),
    };

    try {
      const url = isEditing ? `/api/companies/${initialData?.id}` : "/api/companies";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to save company");
      }

      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-50 zoom-in-95">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <h2 className="text-base font-bold text-foreground">
            {isEditing ? "Edit Company" : "Create New Company"}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          <div>
            <label className="block text-xs font-semibold mb-1">Company Name *</label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Infosys Techworks"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Industry *</label>
              <Input
                required
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. IT Services, FinTech"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">City *</label>
              <Input
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Bengaluru, Mumbai"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Website</label>
              <Input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Phone</label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 80 2852 0261"
              />
            </div>
          </div>

          {isAdmin && users.length > 0 && (
            <div>
              <label className="block text-xs font-semibold mb-1">Account Owner (Sales Rep)</label>
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
                className="w-full h-9 rounded-lg border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">Assign to Me / Default</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-4 flex items-center justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{isEditing ? "Save Changes" : "Create Company"}</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
