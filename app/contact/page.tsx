import { MessageCircle, Mail, Phone } from "lucide-react";
import { SITE } from "@/lib/config";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export default function ContactPage() {
  return (
    <section className="section-pad page-section">
      <div className="contact-layout">
        <div className="contact-visual">
          <img
            src="/images/victor-pedro/hero.jpeg"
            alt="Victor Pedro beside a car in Lagos"
          />
          <div className="contact-caption">
            <p>Need help choosing?</p>
            <strong>Talk directly with our team.</strong>
          </div>
        </div>
        <div className="contact-copy">
          <p className="eyebrow">Get in touch</p>
          <h1>We’re here to help.</h1>
          <p>
            Ask about availability, pricing, specifications or delivery before
            making a decision.
          </p>
          <a
            className="contact-method"
            href={getWhatsAppUrl(
              "Hello Victor Pedro, I would like to enquire about cars or auto parts.",
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle />
            <div>
              <strong>Chat on WhatsApp</strong>
              <span>{SITE.phoneNumber} · Enquiries & price negotiation</span>
            </div>
          </a>
          <a className="contact-method" href={`tel:+${SITE.whatsappNumber}`}>
            <Phone />
            <div>
              <strong>Phone</strong>
              <span>{SITE.phoneNumber}</span>
            </div>
          </a>
          <a className="contact-method" href={`mailto:${SITE.email}`}>
            <Mail />
            <div>
              <strong>Email</strong>
              <span>{SITE.email}</span>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
