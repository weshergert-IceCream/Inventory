import type { Metadata } from "next";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Old Hound Inventory",
  description: "Inventory and ordering system for The Old Hound",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="app-shell">{children}</main>
      </body>
    </html>
  );
}
