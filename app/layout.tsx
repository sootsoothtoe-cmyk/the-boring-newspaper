import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Boring Newspaper",
  description: "Burmese-first neutral headline aggregator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="my">
<head>
    <script
      async
      src="https://www.googletagmanager.com/gtag/js?id=G-N5C423R0KJ"
    />
    <script
      dangerouslySetInnerHTML={{
        __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-N5C423R0KJ', {
            anonymize_ip: true
          });
        `,
      }}
    />
  </head>
      <body>
        {children}
      </body>
    </html>
  );
}
