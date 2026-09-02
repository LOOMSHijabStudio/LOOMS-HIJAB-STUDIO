export type DemoProduct = {
  id: string;
  slug: string;
  name: string;
  category: string;
  price: number;
  salePrice?: number;
  image: string;
  imageAlt: string;
  description: string;
  material: string;
  care: string;
  stock: number;
  isNew?: boolean;
  isBestSeller?: boolean;
  variants: string[];
  variantIds: Record<string, string>;
};

export const demoProducts: DemoProduct[] = [
  { id: "00000000-0000-4000-8000-000000000001", slug: "signature-silk-mocha", name: "Signature Silk", category: "The Essential Edit", price: 289000, salePrice: 249000, image: "/images/editorial-mocha.svg", imageAlt: "Mocha abstract textile composition", description: "A softly draped square scarf designed for quiet, considered daily dressing.", material: "Premium satin voile", care: "Hand wash cold. Dry flat away from direct sunlight.", stock: 12, isNew: true, isBestSeller: true, variants: ["Mocha", "Cream", "Black"], variantIds: { Mocha: "00000000-0000-4000-8000-000000000011", Cream: "00000000-0000-4000-8000-000000000012", Black: "00000000-0000-4000-8000-000000000013" } },
  { id: "00000000-0000-4000-8000-000000000002", slug: "serein-voile-cream", name: "Serein Voile", category: "The Essential Edit", price: 239000, image: "/images/editorial-sand.svg", imageAlt: "Cream abstract textile composition", description: "Light-catching voile with a fluid finish and a refined, breathable hand feel.", material: "Premium airy voile", care: "Hand wash cold. Iron on low heat.", stock: 8, isNew: true, variants: ["Cream", "Sand", "Olive"], variantIds: { Cream: "00000000-0000-4000-8000-000000000021", Sand: "00000000-0000-4000-8000-000000000022", Olive: "00000000-0000-4000-8000-000000000023" } },
  { id: "00000000-0000-4000-8000-000000000003", slug: "atelier-square-olive", name: "Atelier Square", category: "Limited Collection", price: 269000, image: "/images/editorial-olive.svg", imageAlt: "Olive abstract textile composition", description: "An expressive square silhouette for an effortlessly composed finish.", material: "Textured silk blend", care: "Dry clean recommended.", stock: 4, isBestSeller: true, variants: ["Olive", "Stone", "Mocha"], variantIds: { Olive: "00000000-0000-4000-8000-000000000031", Stone: "00000000-0000-4000-8000-000000000032", Mocha: "00000000-0000-4000-8000-000000000033" } },
  { id: "00000000-0000-4000-8000-000000000004", slug: "dawn-modal-teal", name: "Dawn Modal", category: "New Arrivals", price: 219000, image: "/images/editorial-teal.svg", imageAlt: "Teal abstract textile composition", description: "A breathable modal layer in a deep, grounded shade for everyday movement.", material: "Modal blend", care: "Hand wash cold. Do not tumble dry.", stock: 15, isNew: true, variants: ["Dark Teal", "Mushroom", "Cream"], variantIds: { "Dark Teal": "00000000-0000-4000-8000-000000000041", Mushroom: "00000000-0000-4000-8000-000000000042", Cream: "00000000-0000-4000-8000-000000000043" } },
];

export function getDemoProduct(slug: string) { return demoProducts.find((product) => product.slug === slug); }
