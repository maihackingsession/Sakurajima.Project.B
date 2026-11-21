import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Baufrist – Bauleiter-Assistent",
  description: "Baufrist erkennt im Tagesbericht, wann eine Anzeige nötig ist, und erstellt den Entwurf. Ein Assistent für den Bauleiter – kein Ersatz.",
  applicationName: "Baufrist",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffb000",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  );
}
