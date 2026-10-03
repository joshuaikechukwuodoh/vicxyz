import Link from "next/link";
import { ArrowRight, Check, MessageCircle } from "lucide-react";
import CatalogGrid from "@/components/CatalogGrid";
import CategoryGrid from "@/components/CategoryGrid";

export default function Home() {
  return (
    <>
      <section className="hero section-dark">
        <div className="hero-copy">
          <p className="kicker">Lagos, Nigeria · Cars & motor parts</p>
          <h1>
            The right car.
            <br />
            The right parts.
          </h1>
          <p className="hero-text">
            Welcome to Victor Pedro Motor Parts. From cars of all makes to the
            parts that keep them moving, I’m here to help you find what you need
            in Lagos.
          </p>
          <div className="hero-actions">
            <Link href="/shop" className="button dark">
              Explore products <ArrowRight size={18} />
            </Link>
            <Link href="#categories" className="text-link">
              Browse categories
            </Link>
          </div>
          <div className="hero-points">
            <span>
              <Check size={15} /> Curated listings
            </span>
            <span>
              <Check size={15} /> Updated prices
            </span>
            <span>
              <Check size={15} /> WhatsApp ordering
            </span>
          </div>
        </div>
        <div className="hero-media">
          <img
            src="/images/victor-pedro/founder.jpeg"
            alt="Front-facing portrait of Victor Pedro"
            fetchPriority="high"
          />
          <div className="floating-card">
            <small>Meet your car & parts seller</small>
            <strong>Victor Pedro.</strong>
            <span>Cars. Motor parts. A personal conversation.</span>
          </div>
        </div>
      </section>

      <section className="intro section-pad">
        <p className="eyebrow">Made for serious buyers</p>
        <div className="split-heading">
          <h2>A cleaner way to discover your next vehicle or part.</h2>
          <p>
            Browse by category, compare products, save your choices to cart and
            send one complete order request directly to the seller on WhatsApp.
          </p>
        </div>
      </section>

      <section className="section-pad cars-showcase">
        <div className="section-header">
          <div>
            <p className="eyebrow">Find your next drive</p>
            <h2>Cars for every journey.</h2>
          </div>
          <Link href="/category/cars" className="text-link">
            Shop cars <ArrowRight size={16} />
          </Link>
        </div>
        <div className="car-inspiration">
          {[
            [
              "Everyday comfort",
              "photo-1550355291-bbee04a92027",
              "A sedan on the road",
            ],
            [
              "A little more presence",
              "photo-1492144534655-ae79c964c9d7",
              "A sports car photographed from the front",
            ],
            [
              "Built for the open road",
              "photo-1503376780353-7e6692767b70",
              "A luxury sports car",
            ],
          ].map(([title, photo, alt]) => (
            <Link
              href="/category/cars"
              className="car-inspiration-card"
              key={photo}
            >
              <img
                src={`https://images.unsplash.com/${photo}?auto=format&fit=crop&w=1000&q=85`}
                alt={alt}
                loading="lazy"
              />
              <div>
                <h3>{title}</h3>
                <span>
                  Explore our cars <ArrowRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="tiny-note">
          Vehicle inspiration. See current listings below for available cars,
          specifications and prices.
        </p>
        <CatalogGrid category="cars" limit={3} />
      </section>

      <section id="categories" className="section-pad categories-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Shop by category</p>
            <h2>Everything in its place.</h2>
          </div>
          <Link href="/shop" className="text-link">
            View all products <ArrowRight size={16} />
          </Link>
        </div>
        <CategoryGrid />
      </section>

      <section className="stats-strip section-dark">
        <div>
          <strong>Cars</strong>
          <span>Explore different makes</span>
        </div>
        <div>
          <strong>Parts</strong>
          <span>Find what your vehicle needs</span>
        </div>
        <div>
          <strong>Lagos</strong>
          <span>Locally based business</span>
        </div>
        <div>
          <strong>Direct</strong>
          <span>Speak with us about your order</span>
        </div>
      </section>

      <section className="section-pad featured-section">
        <div className="section-header">
          <div>
            <p className="eyebrow">Selected for you</p>
            <h2>Featured products.</h2>
          </div>
          <p className="header-note">
            A small selection of vehicles and parts currently available.
          </p>
        </div>
        <CatalogGrid limit={3} />
      </section>

      <section className="process section-pad">
        <div>
          <p className="eyebrow">Simple ordering</p>
          <h2>From browsing to WhatsApp in four easy steps.</h2>
        </div>
        <div className="process-grid">
          {[
            ["01", "Browse", "Explore products and categories."],
            ["02", "Choose", "Add everything you want to your cart."],
            ["03", "Review", "Check quantities and your estimated total."],
            ["04", "Message", "Send the whole order to WhatsApp."],
          ].map(([n, t, d]) => (
            <div className="process-card" key={n}>
              <span>{n}</span>
              <h3>{t}</h3>
              <p>{d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="founder-section section-pad">
        <div className="founder-photo">
          <img
            src="/images/victor-pedro/founder.jpeg"
            alt="Victor Pedro, owner of Victor Pedro Motor Parts"
            loading="lazy"
          />
        </div>
        <div className="founder-copy">
          <p className="eyebrow">The person behind the business</p>
          <h2>
            Hello, I’m
            <br />
            Victor Pedro.
          </h2>
          <p>
            I’m a business owner in Lagos, selling cars of different makes and
            motor parts. This business is personal to me, and so is helping you
            find the right vehicle or the right part.
          </p>
          <p>
            Whether you know exactly what you need or want to ask a few
            questions first, let’s start a conversation.
          </p>
          <div className="founder-signature">
            Victor Pedro <span>Owner · Lagos, Nigeria</span>
          </div>
          <Link href="/about" className="text-link">
            More about me <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className="cta-band">
        <div>
          <p className="eyebrow light-eye">Ready when you are</p>
          <h2>Found something you like?</h2>
          <p>
            Add it to your cart and continue the conversation directly on
            WhatsApp.
          </p>
        </div>
        <Link href="/shop" className="button light">
          <MessageCircle size={18} /> Start shopping
        </Link>
      </section>
    </>
  );
}
