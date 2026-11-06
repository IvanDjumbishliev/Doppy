import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reel Scroll",
  description: "A new way to explore your next favorite reel.",
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
