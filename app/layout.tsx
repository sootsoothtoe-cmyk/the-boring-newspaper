import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Boring Newspaper",
  description: "Burmese-first neutral headline aggregator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="my">
      <body>
        {children}
      </body>
    </html>
  );
}
