import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Doppy",
  description: "Your AI-powered social video discovery feed.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
