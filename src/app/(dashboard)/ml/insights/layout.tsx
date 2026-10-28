import type { Metadata } from "next";

export const metadata: Metadata = { title: "Model Insights" };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
