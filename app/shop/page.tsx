import ShopCatalog from "@/components/ShopCatalog";

export default function ShopPage() {
  return (
    <section className="section-pad page-section shop-page">
      <div className="page-hero">
        <p className="eyebrow">Cars, parts & more</p>
        <h1>
          Find your next
          <br />
          car or part.
        </h1>
        <p>
          Browse the collection, check prices and choose what you need. Speak
          directly with Victor to confirm availability and arrange your order.
        </p>
      </div>
      <ShopCatalog />
    </section>
  );
}
