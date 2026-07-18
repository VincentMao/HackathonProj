import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consilium",
  description: "The chart proposes, the room disposes.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
