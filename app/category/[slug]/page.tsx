import CategoryCatalog from "@/components/CategoryCatalog"
export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) { return <CategoryCatalog slug={(await params).slug} /> }
