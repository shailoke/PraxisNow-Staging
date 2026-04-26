import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "PraxisNow",
    template: "%s | PraxisNow"
  },
  description: "Realistic AI-powered interview simulations for modern roles.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" }, // fallback for older browsers
    ],
    apple: "/praxisnow-icon-512.svg",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} antialiased bg-background text-foreground`}>
        {children}
      </body>
    </html>
  );
}
