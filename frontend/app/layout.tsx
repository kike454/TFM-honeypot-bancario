import type { Metadata } from "next";
import "./globals.css";
import Header from "./components/Header";
import Footer from "./components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL('https://finconnect.store'),
  title: "FinConnect — Tu banco, todas tus cuentas",
  description: "Accede a todas tus cuentas bancarias en un solo lugar. Seguro, rápido y regulado bajo PSD2.",
  keywords: "agregador bancario, banca online, cuentas bancarias, PSD2, open banking",
  robots: "index, follow",
  openGraph: {
    title: "FinConnect — Agregador bancario PSD2",
    description: "Conecta todos tus bancos en un solo lugar",
    url: "https://finconnect.store",
    siteName: "FinConnect",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <Header />
        <main style={{ flex: 1 }}>
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}