import { prisma, disconnectDatabase } from "../lib/prisma.js";

const C = "https://res.cloudinary.com/dec82taov/image/upload";

const categories = [
  {
    code: "shirt",
    slug: "shirt",
    indexCode: "01",
    name: "SHIRT",
    ghostName: "SHIRT",
    coverUrl: `${C}/v1789785497/shirt_yt8qzc.jpg`,
    coverAlt: "Sicko Soul shirt category",
    spec: "STIFF COTTON · CUT SHARP",
    tagline: "Buttoned to the throat, or not at all.",
    registry: "BUTTONED GOODS / FILE 01",
    sortOrder: 10,
  },
  {
    code: "tshirt",
    slug: "tshirt",
    indexCode: "02",
    name: "T-SHIRT",
    ghostName: "TEE",
    coverUrl: `${C}/v1789785499/tshirt_mu8u7h.jpg`,
    coverAlt: "Sicko Soul T-shirt category",
    spec: "240 GSM · BOXY",
    tagline: "Built to outlive whoever wears it.",
    registry: "HEAVY JERSEY / FILE 02",
    sortOrder: 20,
  },
  {
    code: "baggy",
    slug: "baggy",
    indexCode: "03",
    name: "BAGGY PANT",
    ghostName: "BAGGY",
    coverUrl: `${C}/v1789785499/baggy_poqaqm.jpg`,
    coverAlt: "Sicko Soul baggy pant category",
    spec: "WIDE LEG · HEAVY DRAPE",
    tagline: "Room to run. Not that you will.",
    registry: "LOWER BODY / FILE 03",
    sortOrder: 30,
  },
  {
    code: "dropshoulder",
    slug: "dropshoulder",
    indexCode: "04",
    name: "DROP SHOULDER",
    ghostName: "DROP",
    coverUrl: `${C}/v1789785494/dropsholder_wglvpd.jpg`,
    coverAlt: "Sicko Soul drop shoulder category",
    spec: "OVERSIZED · SEAM DROPPED",
    tagline: "Cut wrong on purpose. That's the point.",
    registry: "OVERSIZED GOODS / FILE 04",
    sortOrder: 40,
  },
  {
    code: "hoodie",
    slug: "hoodie",
    indexCode: "05",
    name: "HOODIE",
    ghostName: "HOOD",
    coverUrl: `${C}/v1789785495/hoodie_qxjjef.jpg`,
    coverAlt: "Sicko Soul hoodie category",
    spec: "FLEECE LINED · HOOD DEEP",
    tagline: "The only face you'll need.",
    registry: "COVERED GOODS / FILE 05",
    sortOrder: 50,
  },
] as const;

const products = [
  {
    category: "shirt",
    id: "shirt-01",
    index: "01",
    name: "THE INFORMANT",
    price: 2890,
    spec: "STIFF POPLIN · CUT SHARP",
    tagline: "Talks less than you do.",
    description: "A hard-cut button shirt built like a statement under questioning. Boxed through the body, blunt at the collar, and clean enough to look deliberate after midnight.",
    details: ["Structured poplin hand", "Boxed shoulder line", "Straight hem", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785497/shirt_1_ipy0yh.png`,
    worn: `${C}/v1789785496/man_shirt_1_hfrlr2.png`,
    alt: "The Informant shirt",
  },
  {
    category: "shirt",
    id: "shirt-02",
    index: "02",
    name: "SECOND OFFENSE",
    price: 3190,
    spec: "HEAVY TWILL · BOXED SHOULDER",
    tagline: "The first one was a warning.",
    description: "A heavier shirt with a squared stance and enough structure to hold its shape when the room does not. Built for repeat offenders, not first impressions.",
    details: ["Heavy twill body", "Boxed shoulder", "Reinforced seams", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785498/shirt_2_whbomw.png`,
    worn: `${C}/v1789785496/man_shirt_2_pa0add.png`,
    alt: "Second Offense shirt",
  },
  {
    category: "shirt",
    id: "shirt-03",
    index: "03",
    name: "NO WITNESS",
    price: 3290,
    spec: "MATTE WEAVE · BLUNT COLLAR",
    tagline: "Nobody saw you leave.",
    description: "Low-shine fabric, severe collar geometry, and a restrained silhouette that reads quiet until it is too close. Made to disappear in bad light and stay remembered anyway.",
    details: ["Matte woven surface", "Blunt collar profile", "Relaxed straight cut", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785498/shirt_3_ivk1rr.png`,
    worn: `${C}/v1789785496/man_shirt_3_ha5vdh.png`,
    alt: "No Witness shirt",
  },
  {
    category: "shirt",
    id: "shirt-04",
    index: "04",
    name: "HOUSE ARREST",
    price: 3590,
    spec: "DOUBLE STITCH · LONG BODY",
    tagline: "Comfortable. Still not free.",
    description: "A longer, heavier shirt with doubled seam work and a locked-in drape. Enough room to move. Not enough to pretend there are no consequences.",
    details: ["Extended body length", "Double-stitch construction", "Relaxed fit", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785498/shirt_4_xxiaua.png`,
    worn: `${C}/v1789785497/man_shirt_4_lmrshp.png`,
    alt: "House Arrest shirt",
  },
  {
    category: "tshirt",
    id: "tshirt-01",
    index: "01",
    name: "DEAD CHANNEL",
    price: 2490,
    spec: "240 GSM · BOXY",
    tagline: "Nothing coming through but static.",
    description: "Dense jersey, a short boxy body, and a dead-air attitude. This is the everyday Sicko Soul uniform stripped down to weight, shape, and signal loss.",
    details: ["240 GSM jersey", "Boxy silhouette", "Dropped shoulder", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785499/tshirt_mu8u7h.jpg`,
    worn: null,
    alt: "Sicko Soul boxy T-shirt",
  },
  {
    category: "baggy",
    id: "baggy-01",
    index: "01",
    name: "WIDE SENTENCE",
    price: 3890,
    spec: "WIDE LEG · HEAVY DRAPE",
    tagline: "A longer sentence than you planned for.",
    description: "A low, wide trouser with enough fabric to move like smoke and enough weight to stay grounded. The silhouette is deliberately oversized from hip to hem.",
    details: ["Wide-leg pattern", "Heavy drape", "Relaxed rise", "Limited archive run"],
    sizes: ["28", "30", "32", "34"],
    defaultSize: "30",
    sizeGroup: "PANT",
    still: `${C}/v1789785499/baggy_poqaqm.jpg`,
    worn: null,
    alt: "Wide Sentence baggy pant",
  },
  {
    category: "dropshoulder",
    id: "dropshoulder-01",
    index: "01",
    name: "BLACKOUT RITUAL",
    price: 3390,
    spec: "OVERSIZED · SEAM DROPPED",
    tagline: "Wide enough to hide what you're carrying.",
    description: "An oversized upper built around a deliberately fallen shoulder line. Heavy, broad, and quiet—the shape does the threatening before the graphics need to.",
    details: ["Dropped shoulder seam", "Oversized body", "Heavy cotton hand", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785494/dropsholder_1_j8amod.jpg`,
    worn: `${C}/v1789785498/man_dropsholder_1_q97paa.png`,
    alt: "Blackout Ritual drop shoulder",
  },
  {
    category: "dropshoulder",
    id: "dropshoulder-02",
    index: "02",
    name: "BAD OMEN",
    price: 3490,
    spec: "HEAVYWEIGHT · BOXY CUT",
    tagline: "Everyone reads the signs too late.",
    description: "A heavyweight box cut that sits away from the body and refuses to look polite. Thick enough to hold the silhouette; loose enough to distort it.",
    details: ["Heavyweight knit", "Boxed fit", "Dropped shoulder", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785494/dropsholder_2_hp10y4.jpg`,
    worn: `${C}/v1789785499/man_dropsholder_2_loowuy.png`,
    alt: "Bad Omen drop shoulder",
  },
  {
    category: "dropshoulder",
    id: "dropshoulder-03",
    index: "03",
    name: "COLD BLOODED",
    price: 3690,
    spec: "DOUBLE PANEL · DROPPED SEAM",
    tagline: "It doesn't flinch. Neither should you.",
    description: "Built with a harder panelled structure and an intentionally displaced shoulder. The fit lands wide, the line stays severe, and the garment keeps its distance.",
    details: ["Double-panel build", "Dropped seam", "Wide body", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785494/dropsholder_3_utqwpg.jpg`,
    worn: `${C}/v1789785499/man_dropsholder_3_ph0cdj.png`,
    alt: "Cold Blooded drop shoulder",
  },
  {
    category: "dropshoulder",
    id: "dropshoulder-04",
    index: "04",
    name: "UNDER THE HOOD",
    price: 3790,
    spec: "HEAVY COTTON · BOXED FIT",
    tagline: "You don't see the face. Just the shape.",
    description: "A broad, heavy cotton shape designed to read as mass before detail. It hangs clean, sits wide, and keeps the wearer visually one step removed.",
    details: ["Heavy cotton body", "Boxed silhouette", "Wide sleeve", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785495/dropsholder_4_up1j9e.jpg`,
    worn: `${C}/v1789785496/man_dropsholder_4_du6t1a.png`,
    alt: "Under The Hood drop shoulder",
  },
  {
    category: "hoodie",
    id: "hoodie-01",
    index: "01",
    name: "NO FACE",
    price: 4290,
    spec: "FLEECE LINED · HOOD DEEP",
    tagline: "Recognition was never part of the plan.",
    description: "A deep-hood fleece layer built to collapse the face into shadow. Heavy enough for structure, loose enough to disappear inside, and finished without unnecessary noise.",
    details: ["Fleece-lined body", "Deep hood profile", "Relaxed fit", "Limited archive run"],
    sizes: ["S", "M", "L", "XL"],
    defaultSize: "M",
    sizeGroup: "TOP",
    still: `${C}/v1789785495/hoodie_qxjjef.jpg`,
    worn: null,
    alt: "No Face Sicko Soul hoodie",
  },
] as const;

async function main() {
  for (const category of categories) {
    await prisma.product_categories.upsert({
      where: { slug: category.slug },
      create: {
        code: category.code,
        slug: category.slug,
        index_code: category.indexCode,
        name: category.name,
        ghost_name: category.ghostName,
        spec: category.spec,
        tagline: category.tagline,
        registry: category.registry,
        cover_url: category.coverUrl,
        cover_alt: category.coverAlt,
        sort_order: category.sortOrder,
        is_active: true,
      },
      update: {
        code: category.code,
        index_code: category.indexCode,
        name: category.name,
        ghost_name: category.ghostName,
        spec: category.spec,
        tagline: category.tagline,
        registry: category.registry,
        cover_url: category.coverUrl,
        cover_alt: category.coverAlt,
        sort_order: category.sortOrder,
        is_active: true,
      },
    });
  }

  for (const product of products) {
    const category = await prisma.product_categories.findUnique({
      where: { slug: product.category },
    });
    if (!category) throw new Error(`Missing category ${product.category}`);

    const row = await prisma.products.upsert({
      where: { public_id: product.id },
      create: {
        category_id: category.category_id,
        public_id: product.id,
        slug: product.id,
        index_code: product.index,
        sku_base: product.id.toUpperCase(),
        name: product.name,
        base_price: product.price,
        currency: "BDT",
        spec: product.spec,
        tagline: product.tagline,
        description: product.description,
        status: "ACTIVE",
        published_at: new Date(),
      },
      update: {
        category_id: category.category_id,
        slug: product.id,
        index_code: product.index,
        sku_base: product.id.toUpperCase(),
        name: product.name,
        base_price: product.price,
        currency: "BDT",
        spec: product.spec,
        tagline: product.tagline,
        description: product.description,
        status: "ACTIVE",
        published_at: new Date(),
      },
    });

    await prisma.product_images.deleteMany({ where: { product_id: row.product_id } });
    await prisma.product_images.createMany({
      data: [
        {
          product_id: row.product_id,
          image_type: "STILL",
          image_url: product.still,
          alt_text: product.alt,
          sort_order: 10,
        },
        ...(product.worn
          ? [{
              product_id: row.product_id,
              image_type: "WORN" as const,
              image_url: product.worn,
              alt_text: `${product.name} worn`,
              sort_order: 20,
            }]
          : []),
      ],
    });

    await prisma.product_features.deleteMany({ where: { product_id: row.product_id } });
    await prisma.product_features.createMany({
      data: product.details.map((detail, index) => ({
        product_id: row.product_id,
        feature_text: detail,
        sort_order: (index + 1) * 10,
      })),
    });

    for (const [index, sizeCode] of product.sizes.entries()) {
      const size = await prisma.sizes.upsert({
        where: {
          code_size_group: {
            code: sizeCode,
            size_group: product.sizeGroup,
          },
        },
        create: {
          code: sizeCode,
          label: sizeCode,
          size_group: product.sizeGroup,
          sort_order: (index + 1) * 10,
          is_active: true,
        },
        update: {
          sort_order: (index + 1) * 10,
          is_active: true,
        },
      });

      const variant = await prisma.product_variants.upsert({
        where: {
          product_id_size_id: {
            product_id: row.product_id,
            size_id: size.size_id,
          },
        },
        create: {
          product_id: row.product_id,
          size_id: size.size_id,
          sku: `${product.id.toUpperCase()}-${sizeCode}`,
          price_override: null,
          is_default: sizeCode === product.defaultSize,
          status: "ACTIVE",
        },
        update: {
          sku: `${product.id.toUpperCase()}-${sizeCode}`,
          price_override: null,
          is_default: sizeCode === product.defaultSize,
          status: "ACTIVE",
        },
      });

      const existingStock = await prisma.inventory_stock.findUnique({
        where: { variant_id: variant.variant_id },
      });
      if (!existingStock) {
        const initialQty = index === product.sizes.length - 1 ? 3 : 8;
        await prisma.inventory_stock.create({
          data: {
            variant_id: variant.variant_id,
            on_hand_qty: initialQty,
            reserved_qty: 0,
            reorder_level: 2,
          },
        });
        await prisma.inventory_movements.create({
          data: {
            variant_id: variant.variant_id,
            movement_type: "INITIAL",
            on_hand_delta: initialQty,
            reserved_delta: 0,
            reference_type: "SYSTEM",
            note: "Initial catalog seed stock.",
          },
        });
      }
    }
  }

  const byPublicId = new Map(
    (await prisma.products.findMany({
      where: { public_id: { in: products.map((product) => product.id) } },
      select: { product_id: true, public_id: true },
    })).map((row) => [row.public_id, row.product_id]),
  );

  const collections = [
    {
      code: "DROP-001",
      slug: "black-file",
      name: "BLACK FILE",
      tagline: "THE FIRST RECORD NEVER CLOSED.",
      releaseYear: 2026,
      status: "LIVE" as const,
      products: products.slice(0, 6).map((product, index) => ({
        publicId: product.id,
        sortOrder: index + 1,
        sealed: false,
      })),
    },
    {
      code: "DROP-000",
      slug: "first-offense",
      name: "FIRST OFFENSE",
      tagline: "THE ORIGINAL INCIDENT.",
      releaseYear: 2026,
      status: "SEALED" as const,
      products: products.slice(2, 7).map((product, index) => ({
        publicId: product.id,
        sortOrder: index + 1,
        sealed: true,
      })),
    },
  ];

  for (const input of collections) {
    const collection = await prisma.collections.upsert({
      where: { slug: input.slug },
      create: {
        code: input.code,
        slug: input.slug,
        name: input.name,
        tagline: input.tagline,
        release_year: input.releaseYear,
        status: input.status,
      },
      update: {
        code: input.code,
        name: input.name,
        tagline: input.tagline,
        release_year: input.releaseYear,
        status: input.status,
      },
    });
    await prisma.collection_products.deleteMany({
      where: { collection_id: collection.collection_id },
    });
    await prisma.collection_products.createMany({
      data: input.products.map((item) => ({
        collection_id: collection.collection_id,
        product_id: byPublicId.get(item.publicId)!,
        sort_order: item.sortOrder,
        is_sealed: item.sealed,
      })),
    });
  }

  console.log(`Seeded ${categories.length} categories, ${products.length} products, and 2 collections.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectDatabase();
  });
