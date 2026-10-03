import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function AboutPage() {
  return (
    <section className="section-pad page-section about-page">
      <div className="page-hero wide">
        <p className="eyebrow">Meet the owner · Lagos, Nigeria</p>
        <h1>
          A personal business.
          <br />A passion for cars.
        </h1>
        <p>
          I’m Victor Pedro, a business owner based in Lagos. I sell cars of
          different makes and auto parts, helping customers find what they need
          for the road ahead.
        </p>
      </div>
      <div className="about-grid">
        <div className="about-image owner-portrait">
          <img
            src="/images/victor-pedro/portrait.jpeg"
            alt="Victor Pedro in Lagos"
            loading="lazy"
          />
        </div>
        <div className="about-copy">
          <p className="eyebrow">My business</p>
          <h2>
            Your next car.
            <br />
            Your essential parts.
          </h2>
          <p>
            Victor Pedro Automobile brings cars and auto parts together in one
            place. Browse the collection, tell us what you’re looking for, and
            ask about availability, specifications and prices before you choose.
          </p>
          <p>
            Looking for a particular make or a replacement part? Get in touch
            with the details of your vehicle so we can discuss what you need.
          </p>
          <Link href="/contact" className="button dark">
            Let’s talk <ArrowRight size={16} />
          </Link>
        </div>
      </div>
      <div className="owner-gallery">
        <div className="section-header">
          <div>
            <p className="eyebrow">Beyond the business</p>
            <h2>A little more of me.</h2>
          </div>
          <p className="header-note">
            The person behind the name, in a few everyday moments.
          </p>
        </div>
        <div className="owner-gallery-grid">
          <figure>
            <img
              src="/images/victor-pedro/lifestyle.jpeg"
              alt="Victor Pedro relaxing in a chair"
              loading="lazy"
            />
          </figure>
          <figure>
            <img
              src="/images/victor-pedro/reading.jpeg"
              alt="Victor Pedro enjoying a book"
              loading="lazy"
            />
          </figure>
        </div>
      </div>
    </section>
  );
}
