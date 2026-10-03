import Brand from "./Brand";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SITE } from "@/lib/config";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-owner">
        <div className="footer-owner-photo">
          <img
            src="/images/victor-pedro/hero.jpeg"
            alt="Victor Pedro beside a black car in Lagos"
            loading="lazy"
            width={486}
            height={1080}
          />
        </div>
        <div className="footer-owner-copy">
          <p className="eyebrow">Your local car & parts seller</p>
          <h2>
            A real person.
            <br />A personal conversation.
          </h2>
          <p>
            I'm Victor Pedro. Whether you're looking for your next car or a part
            to keep yours moving, let's talk about what you need.
          </p>
          <a
            className="button dark"
            href={getWhatsAppUrl(
              "Hello Victor Pedro, I would like to enquire about cars or auto parts.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            Talk to Victor <ArrowRight size={16} />
          </a>
        </div>
      </div>
      <div className="footer-top">
        <div>
          <div className="brand light">
            <Brand />
          </div>
          <p>
            Cars of different makes and auto parts. A personal business, proudly
            based in Lagos, Nigeria.
          </p>
        </div>
        <div>
          <h4>Explore</h4>
          <Link href="/shop">Shop</Link>
          <Link href="/#categories">Categories</Link>
          <Link href="/about">About</Link>
        </div>
        <div>
          <h4>Support</h4>
          <Link href="/contact">Contact</Link>
          <Link href="/cart">Your cart</Link>
          <a
            href={getWhatsAppUrl(
              "Hello Victor Pedro, I would like to enquire about cars or auto parts.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp: {SITE.phoneNumber}
          </a>
          <a href={`mailto:${SITE.email}`}>{SITE.email}</a>
        </div>
        <div>
          <h4>Hours</h4>
          <p>Mon – Sat</p>
          <p>8:00 AM – 6:00 PM</p>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 Victor Pedro Automobile. All rights reserved.</span>
        <span>victorpedroautomobile.com</span>
      </div>
    </footer>
  );
}
