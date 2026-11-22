import type { Metadata, Viewport } from "next";
import { Libre_Franklin, Newsreader } from "next/font/google";
import "./globals.css";

// Self-hosted at build time: works without venue Wi-Fi.
const serif = Newsreader({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], style: ["normal", "italic"], variable: "--font-newsreader" });
const sans = Libre_Franklin({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-franklin" });

export const metadata: Metadata = {
  title: "Baufrist – Bauleiter-Assistent",
  description: "Baufrist erkennt im Tagesbericht, wann eine Anzeige nötig ist, und erstellt den Entwurf. Ein Assistent für den Bauleiter – kein Ersatz.",
  applicationName: "Baufrist",
  metadataBase: new URL("https://baufrist.vercel.app"),
  openGraph: {
    title: "Baufrist – Bauleiter-Assistent",
    description: "Erkennt im Bautagebuch, wann eine Anzeige nötig ist, und erstellt den Entwurf.",
    url: "https://baufrist.vercel.app",
    siteName: "Baufrist",
    locale: "de_DE",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${serif.variable} ${sans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
