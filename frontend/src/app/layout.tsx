import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AgroConnect — Connecting Agriculture. Empowering Markets.",
    template: "%s | AgroConnect",
  },
  description:
    "Bringing farmers, buyers and transporters together to make agricultural trade simpler, smarter and more accessible.",
  applicationName: "AgroConnect",
  keywords: [
    "agriculture",
    "farmers",
    "buyers",
    "transporters",
    "agricultural marketplace",
    "AgroConnect",
  ],
  openGraph: {
    title: "AgroConnect — Connecting Agriculture. Empowering Markets.",
    description:
      "Bringing farmers, buyers and transporters together to make agricultural trade simpler, smarter and more accessible.",
    siteName: "AgroConnect",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-soft-bg text-deep-navy">
        <a href="#main" className="skip-link">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
