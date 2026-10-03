import Link from "next/link"
import { ArrowRight, Check, MessageCircle } from "lucide-react"
import ProductCard from "@/components/ProductCard"
import { categories, products } from "@/lib/products"

export default function Home() {
  const featured = products.filter((p) => p.featured)
  return (
    <>
      <section className="hero section-dark">
        <div className="hero-copy">
          <p className="kicker">Lagos, Nigeria · Cars & motor parts</p>
          <h1>The right car.<br />The right parts.</h1>
          <p className="hero-text">Welcome to Victor Pedro Motor Parts. From cars of all makes to the parts that keep them moving, I’m here to help you find what you need in Lagos.</p>
          <div className="hero-actions"><Link href="/shop" className="button dark">Explore products <ArrowRight size={18}/></Link><Link href="#categories" className="text-link">Browse categories</Link></div>
          <div className="hero-points"><span><Check size={15}/> Curated listings</span><span><Check size={15}/> Updated prices</span><span><Check size={15}/> WhatsApp ordering</span></div>
        </div>
        <div className="hero-media"><img src="/images/victor-pedro/hero.jpeg" alt="Victor Pedro beside a car in Lagos" fetchPriority="high"/><div className="floating-card"><small>Meet your car & parts seller</small><strong>Victor Pedro.</strong><span>Cars. Motor parts. A personal conversation.</span></div></div>
      </section>

      <section className="intro section-pad">
        <p className="eyebrow">Made for serious buyers</p>
        <div className="split-heading"><h2>A cleaner way to discover your next vehicle or part.</h2><p>Browse by category, compare products, save your choices to cart and send one complete order request directly to the seller on WhatsApp.</p></div>
      </section>

      <section id="categories" className="section-pad categories-section">
        <div className="section-header"><div><p className="eyebrow">Shop by category</p><h2>Everything in its place.</h2></div><Link href="/shop" className="text-link">View all products <ArrowRight size={16}/></Link></div>
        <div className="category-grid">
          {categories.map((category, i) => (
            <Link href={`/category/${category.slug}`} key={category.slug} className={`category-card c${i+1}`}>
              <img src={category.image} alt={category.name}/><div className="overlay"/><span className="category-index">0{i+1}</span><div className="category-name"><h3>{category.name}</h3><ArrowRight/></div>
            </Link>
          ))}
        </div>
      </section>

      <section className="stats-strip section-dark">
        <div><strong>Cars</strong><span>Explore different makes</span></div>
        <div><strong>Parts</strong><span>Find what your vehicle needs</span></div>
        <div><strong>Lagos</strong><span>Locally based business</span></div>
        <div><strong>Direct</strong><span>Speak with us about your order</span></div>
      </section>

      <section className="section-pad featured-section">
        <div className="section-header"><div><p className="eyebrow">Selected for you</p><h2>Featured products.</h2></div><p className="header-note">A small selection of vehicles and parts currently available.</p></div>
        <div className="product-grid">{featured.map((product) => <ProductCard product={product} key={product.id}/>)}</div>
      </section>

      <section className="process section-pad">
        <div><p className="eyebrow">Simple ordering</p><h2>From browsing to WhatsApp in four easy steps.</h2></div>
        <div className="process-grid">
          {[['01','Browse','Explore products and categories.'],['02','Choose','Add everything you want to your cart.'],['03','Review','Check quantities and your estimated total.'],['04','Message','Send the whole order to WhatsApp.']].map(([n,t,d]) => <div className="process-card" key={n}><span>{n}</span><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </section>

      <section className="founder-section section-pad">
        <div className="founder-photo"><img src="/images/victor-pedro/founder.jpeg" alt="Victor Pedro, owner of Victor Pedro Motor Parts" loading="lazy" /></div>
        <div className="founder-copy"><p className="eyebrow">The person behind the business</p><h2>Hello, I’m<br />Victor Pedro.</h2><p>I’m a business owner in Lagos, selling cars of different makes and motor parts. This business is personal to me, and so is helping you find the right vehicle or the right part.</p><p>Whether you know exactly what you need or want to ask a few questions first, let’s start a conversation.</p><div className="founder-signature">Victor Pedro <span>Owner · Lagos, Nigeria</span></div><Link href="/about" className="text-link">More about me <ArrowRight size={16} /></Link></div>
      </section>

      <section className="cta-band">
        <div><p className="eyebrow light-eye">Ready when you are</p><h2>Found something you like?</h2><p>Add it to your cart and continue the conversation directly on WhatsApp.</p></div>
        <Link href="/shop" className="button light"><MessageCircle size={18}/> Start shopping</Link>
      </section>
    </>
  )
}
