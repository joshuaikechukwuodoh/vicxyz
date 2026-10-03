import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/lib/config";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
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
