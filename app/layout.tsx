import type { Metadata } from "next";
import "./globals.css";
import { SITE } from "@/lib/config";
import { safeJsonLd } from "@/lib/seo";
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
    default:
      "Cars, Motorcycles & Auto Parts in Lagos | Victor Pedro Automobile",
    template: "%s | Victor Pedro Automobile",
  },
  description:
    "Browse cars, electric bikes, motorcycles and auto parts in Lagos, Nigeria. See current prices and real photos, then enquire with Victor Pedro on WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: safeJsonLd({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": SITE.url + "/#business",
              name: SITE.name,
              url: SITE.url,
              logo: SITE.url + "/images/victor-pedro/logo.png",
              email: SITE.email,
              telephone: "+2348084549079",
              address: {
                "@type": "PostalAddress",
                addressLocality: "Lagos",
                addressCountry: "NG",
              },
            }),
          }}
        />
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
