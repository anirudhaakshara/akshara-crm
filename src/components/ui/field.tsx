import * as React from "react";

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

/**
 * Label + control + inline error, shared by all forms.
 */
export function Field({ label, htmlFor, required, error, children }: FieldProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-xs font-semibold mb-1">
        {label}
        {required && <span className="text-red-700 dark:text-red-400"> *</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-[11px] text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
