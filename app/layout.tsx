import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Contract Review - Romanian & EU Law",
  description: "AI-assisted contract analysis and legal compliance checking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
