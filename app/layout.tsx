import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/lib/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32 48x48 96x96", type: "image/x-icon" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  title: {
    default: "Victor Pedro Automobile | victorpedroautomobile.com",
    template: "%s | Victor Pedro Automobile",
  },
  description:
    "Meet Victor Pedro, a Lagos business owner selling cars of different makes and auto parts. Browse vehicles and parts and enquire directly.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
