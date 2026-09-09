import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Old Hound Inventory",
  description: "Inventory and ordering system for The Old Hound",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
