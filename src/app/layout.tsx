import type { Metadata } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";

export const metadata: Metadata = {
  title: "Annot — PDF Research Assistant",
  description: "Read papers with AI. Highlight, annotate, and chat with your research documents.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="h-full bg-surface" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
