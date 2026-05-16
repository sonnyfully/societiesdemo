import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Homophily Simulation",
  description: "A scaled-down Claude Haiku replication of LLM homophily dynamics."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
