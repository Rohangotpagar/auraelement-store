/**
 * Aura Element — MongoDB Seed Script
 *
 * Run from project root:
 *   npx ts-node src/mongodb-seed.ts
 *
 * Or compile first:
 *   npx tsc src/mongodb-seed.ts --outDir dist && node dist/mongodb-seed.js
 *
 * Env vars:
 *   MONGODB_URI   — full connection string (default: mongodb://localhost:27017)
 *   MONGODB_DB    — database name         (default: aura_element)
 */

interface ProductNote {
  top: string[];
  heart: string[];
  base: string[];
}

interface ProductSeed {
  slug: string;
  title: string;
  tagline: string;
  mrpPrice: number;
  salePrice: number;
  concentration: number;
  volume: string;
  description: string;
  notes: ProductNote;
  main_image_url: string;
  secondary_image_url: string;
  in_stock: boolean;
  created_at: Date;
}

const BUNDLE_PRICE = 999;   // any 2 perfumes = ₹999
const SALE_PRICE   = 799;   // single unit sale price
const MRP_PRICE    = 1199;  // original MRP

const products: ProductSeed[] = [
  {
    slug: "ocean-rush",
    title: "Ocean Rush",
    tagline: "Tides of Confidence",
    mrpPrice: MRP_PRICE,
    salePrice: SALE_PRICE,
    concentration: 25,
    volume: "50ml",
    description:
      "A surge of coastal power — bergamot and sea salt crash over a driftwood heart before settling into warm ambergris. Designed for those who move with the force of the ocean and leave a trail that lingers like the tide.",
    notes: {
      top: ["Sea Salt", "Bergamot", "Marine Accord"],
      heart: ["Driftwood", "Aquatic Iris", "Cardamom"],
      base: ["Ambergris", "Sandalwood", "White Musk"],
    },
    main_image_url:
      "https://images.unsplash.com/photo-1627468030538-06a962182a88?w=800&h=1000&fit=crop&auto=format",
    secondary_image_url:
      "https://images.unsplash.com/photo-1571129163925-84289ec292d1?w=800&h=1000&fit=crop&auto=format",
    in_stock: true,
    created_at: new Date(),
  },
  {
    slug: "primal-storm",
    title: "Primal Storm",
    tagline: "Raw. Unfiltered. Unafraid.",
    mrpPrice: MRP_PRICE,
    salePrice: SALE_PRICE,
    concentration: 25,
    volume: "50ml",
    description:
      "The scent of charged air before lightning strikes. Black pepper and smoky incense ignite over a smouldering oud core — bold, primal, and impossible to ignore. For those who own every room they enter.",
    notes: {
      top: ["Black Pepper", "Grapefruit", "Smoked Aldehydes"],
      heart: ["Oud Wood", "Dark Rose", "Incense"],
      base: ["Labdanum", "Vetiver", "Charred Amber"],
    },
    main_image_url:
      "https://images.unsplash.com/photo-1624811742200-69166e7b7bcc?w=800&h=1000&fit=crop&auto=format",
    secondary_image_url:
      "https://images.unsplash.com/photo-1598634222670-87c5f558119c?w=800&h=1000&fit=crop&auto=format",
    in_stock: true,
    created_at: new Date(),
  },
  {
    slug: "velvet-blossom",
    title: "Velvet Blossom",
    tagline: "Softness is Strength",
    mrpPrice: MRP_PRICE,
    salePrice: SALE_PRICE,
    concentration: 25,
    volume: "50ml",
    description:
      "A bloom at golden hour — fresh peony meets damask rose on a bed of cashmere musk. Feminine without fragility, romantic without effort. Velvet Blossom is the scent of a woman who has nothing left to prove.",
    notes: {
      top: ["Peony", "Lychee", "Pink Pepper"],
      heart: ["Damask Rose", "Magnolia", "Ylang Ylang"],
      base: ["Cashmere Musk", "White Amber", "Sandalwood"],
    },
    main_image_url:
      "https://images.unsplash.com/photo-1613521140785-e85e427f8002?w=800&h=1000&fit=crop&auto=format",
    secondary_image_url:
      "https://images.unsplash.com/photo-1541108564883-bec8126021f5?w=800&h=1000&fit=crop&auto=format",
    in_stock: true,
    created_at: new Date(),
  },
  {
    slug: "rio-glow",
    title: "Rio Glow",
    tagline: "Golden Hour, Bottled",
    mrpPrice: MRP_PRICE,
    salePrice: SALE_PRICE,
    concentration: 25,
    volume: "50ml",
    description:
      "The warmth of sun-soaked skin at dusk — mandarin and neroli spark into a heart of tuberose and coconut, settling into vanilla-glazed amber. Effortlessly joyful, radiantly alive. Made for living in full colour.",
    notes: {
      top: ["Mandarin", "Neroli", "Coconut Water"],
      heart: ["Tuberose", "Passion Fruit", "Jasmine"],
      base: ["Vanilla", "Golden Amber", "Tonka Bean"],
    },
    main_image_url:
      "https://images.unsplash.com/photo-1690790591188-3503c1a4dcb6?w=800&h=1000&fit=crop&auto=format",
    secondary_image_url:
      "https://images.unsplash.com/photo-1622618991746-fe6004db3a47?w=800&h=1000&fit=crop&auto=format",
    in_stock: true,
    created_at: new Date(),
  },
];

/**
 * Bundle pricing logic — replicated here for reference.
 * The same function is used client-side in App.tsx.
 *
 * Rules:
 *   qty 1 → ₹799
 *   qty 2 → ₹999   (bundle saves ₹599)
 *   qty 3 → ₹999 + ₹799 = ₹1,798
 *   qty 4 → ₹999 × 2 = ₹1,998
 */
function computeBundleTotal(totalQty: number): number {
  const pairs = Math.floor(totalQty / 2);
  const singles = totalQty % 2;
  return pairs * BUNDLE_PRICE + singles * SALE_PRICE;
}

async function seed(): Promise<void> {
  // Dynamic require so this file is valid TS without mongodb in devDependencies.
  // Add mongodb: npm install mongodb
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { MongoClient } = require("mongodb") as typeof import("mongodb");

  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017";
  const dbName = process.env.MONGODB_DB ?? "aura_element";

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("✓ Connected to MongoDB");

    const db = client.db(dbName);
    const col = db.collection<ProductSeed>("products");

    await col.drop().catch(() => {
      /* collection didn't exist yet */
    });

    await col.createIndex({ slug: 1 }, { unique: true });
    await col.createIndex({ in_stock: 1 });
    await col.createIndex({ created_at: -1 });

    const { insertedCount } = await col.insertMany(products);
    console.log(`✓ Inserted ${insertedCount} products into '${dbName}.products'\n`);

    products.forEach((p) => {
      console.log(
        `   ${p.title.padEnd(18)} MRP ₹${p.mrpPrice}  →  Sale ₹${p.salePrice}  |  ${p.concentration}% Parfum`
      );
    });

    console.log("\n✓ Bundle pricing reference:");
    [1, 2, 3, 4].forEach((qty) => {
      console.log(
        `   ${qty} bottle${qty > 1 ? "s" : ""}  →  ₹${computeBundleTotal(qty).toLocaleString("en-IN")}`
      );
    });

    console.log("\n✓ Seed complete.");
  } catch (err) {
    console.error("✗ Seed failed:", err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
