import type { Metadata } from "next";

export const metadata: Metadata = { title: "Deals & Pipeline" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
