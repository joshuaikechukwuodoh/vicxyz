export type Product = {
  id: string
  name: string
  slug: string
  category: string
  categorySlug: string
  price: number
  stock: number
  condition: string
  description: string
  image: string
  featured?: boolean
}

export const categories = [
  { name: "Motorcycles", slug: "motorcycles", image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=80" },
  { name: "Cars", slug: "cars", image: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1400&q=80" },
  { name: "Motor Parts", slug: "motor-parts", image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1400&q=80" },
  { name: "Accessories", slug: "accessories", image: "https://images.unsplash.com/photo-1591637333184-19aa84b3e01f?auto=format&fit=crop&w=1400&q=80" }
]

export const products: Product[] = [
  {
    id: "p1",
    name: "Honda CBR 500R",
    slug: "honda-cbr-500r",
    category: "Motorcycles",
    categorySlug: "motorcycles",
    price: 4500000,
    stock: 3,
    condition: "Foreign Used",
    description: "A balanced sport bike with confident power, sharp styling and everyday comfort.",
    image: "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1400&q=80",
    featured: true
  },
  {
    id: "p2",
    name: "Toyota Camry XSE",
    slug: "toyota-camry-xse",
    category: "Cars",
    categorySlug: "cars",
    price: 28500000,
    stock: 2,
    condition: "Foreign Used",
    description: "Premium comfort, bold looks and dependable everyday performance.",
    image: "https://images.unsplash.com/photo-1550355291-bbee04a92027?auto=format&fit=crop&w=1400&q=80",
    featured: true
  },
  {
    id: "p3",
    name: "Yamaha MT-07",
    slug: "yamaha-mt-07",
    category: "Motorcycles",
    categorySlug: "motorcycles",
    price: 6200000,
    stock: 4,
    condition: "Brand New",
    description: "Lightweight, responsive and built for riders who want excitement without complexity.",
    image: "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1400&q=80",
    featured: true
  },
  {
    id: "p4",
    name: "Performance Brake Kit",
    slug: "performance-brake-kit",
    category: "Motor Parts",
    categorySlug: "motor-parts",
    price: 185000,
    stock: 14,
    condition: "Brand New",
    description: "A complete high-performance brake upgrade kit for stronger, more consistent stopping power.",
    image: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "p5",
    name: "Luxury Steering Wheel",
    slug: "luxury-steering-wheel",
    category: "Accessories",
    categorySlug: "accessories",
    price: 95000,
    stock: 9,
    condition: "Brand New",
    description: "Premium grip, refined finish and an upgraded cabin feel.",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1400&q=80"
  },
  {
    id: "p6",
    name: "Mercedes-Benz C300",
    slug: "mercedes-benz-c300",
    category: "Cars",
    categorySlug: "cars",
    price: 42000000,
    stock: 1,
    condition: "Foreign Used",
    description: "A refined executive sedan with premium comfort and confident road presence.",
    image: "https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=1400&q=80"
  }
]

export const formatPrice = (price: number) => `₦${price.toLocaleString("en-NG")}`
