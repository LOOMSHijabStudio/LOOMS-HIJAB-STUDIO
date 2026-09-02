import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  ),
  title: { default: "LOOMS", template: "%s | LOOMS" },
  description: "Premium Indonesian hijab and fashion.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "LOOMS",
    title: "LOOMS",
    description: "Premium Indonesian hijab and fashion.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className={poppins.variable}>{children}</body>
    </html>
  );
}
