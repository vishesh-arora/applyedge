import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ApplyEdge — Get More Recruiter Callbacks",
  description: "ATS-optimised resumes and LinkedIn profiles for product professionals in India.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
