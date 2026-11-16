import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GST412 Manual Tracker",
  description: "Verify GST412 manual payment and download your personalised manual",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
