import ProductDetails from "@/components/ProductDetails"
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) { return <ProductDetails slug={(await params).slug} /> }
