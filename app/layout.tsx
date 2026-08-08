import type { Metadata } from "next";
import { DM_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

const metadataBase = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000"),
);

export const metadata: Metadata = {
  metadataBase,
  title: "MandateLab — Break the mandate before the agent does",
  description:
    "Adversarial policy testing and deterministic onchain enforcement for autonomous DeFi agents on Monad.",
  icons: {
    icon: "/brand/mandatelab-logo.png",
  },
  openGraph: {
    title: "MandateLab — Break the mandate before the agent does",
    description:
      "Mutation testing and deterministic onchain enforcement for autonomous finance on Monad.",
    type: "website",
    images: [
      {
        url: "/brand/mandatelab-header-dark.png",
        width: 1942,
        height: 809,
        alt: "MandateLab adversarial mutation paths passing through a verification gate",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MandateLab — Break the mandate before the agent does",
    description:
      "Mutation testing and deterministic onchain enforcement for autonomous finance on Monad.",
    images: ["/brand/mandatelab-header-dark.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${dmMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
