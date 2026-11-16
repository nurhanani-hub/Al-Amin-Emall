import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HRMS Al-Amin Emall | Sistem Pengurusan Sumber Manusia Berasaskan AI",
  description:
    "Platform HRMS bersepadu untuk Al-Amin Emall Malaysia: kehadiran, tugasan, kalendar, latihan, pencapaian, komunikasi dalaman, dokumen, dan modul AI.",
  keywords: [
    "HRMS", "Al-Amin Emall", "Sumber Manusia", "Kehadiran", "Tugasan",
    "Latihan", "AI HR", "Malaysia", "Pengurusan Staf",
  ],
  authors: [{ name: "Pasukan Produk Al-Amin Emall" }],
  icons: { icon: "/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
