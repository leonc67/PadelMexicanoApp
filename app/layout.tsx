import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Padel Mexicano",
  description: "Run Padel Mexicano tournaments with live leaderboards",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#2c4a3e] text-white antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
