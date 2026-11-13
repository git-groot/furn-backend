import { Pool } from 'pg';
import { env, getUnpooledDatabaseUrl } from '../config/env';
import { logger } from '../config/logger';
import { maskConnectionString } from '../utils/mask';
import { hashPassword } from '../utils/password';

export const isDatabaseSeeded = async (pool: Pool): Promise<boolean> => {
  try {
    const res = await pool.query<{ count: string }>('SELECT COUNT(*) as count FROM products');
    const count = parseInt(res.rows[0]?.count || '0', 10);
    return count > 0;
  } catch {
    return false;
  }
};

export const runSeed = async (): Promise<void> => {
  const unpooledUrl = getUnpooledDatabaseUrl();
  logger.info(`🌱 Seeding database with original MyFurniture sample data using direct connection (${maskConnectionString(unpooledUrl)})...`);

  const pool = new Pool({
    connectionString: unpooledUrl,
    ssl: { rejectUnauthorized: true },
    max: 2,
    connectionTimeoutMillis: 10000,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Create Users
    logger.info('Seeding users...');
    const adminPass = await hashPassword(env.ADMIN_PASSWORD || 'Admin@123456');
    const customerPass = await hashPassword('Customer@123456');
    const adminEmail = (env.ADMIN_EMAIL || 'admin@myfurniture.com').toLowerCase().trim();

    const adminRes = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role, is_active)
       VALUES ($1, $2, $3, $4, $5, 'admin', true)
       ON CONFLICT (email) DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         role = 'admin',
         is_active = true,
         deleted_at = NULL
       RETURNING id`,
      [adminEmail, adminPass, 'MyFurniture', 'Administrator', '+91 9876543210'],
    );
    const adminId = adminRes.rows[0].id;

    const customerRes = await client.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
       VALUES ($1, $2, $3, $4, $5, 'customer')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
       RETURNING id`,
      ['john.doe@example.com', customerPass, 'John', 'Doe', '+91 9123456780'],
    );
    const customerId = customerRes.rows[0].id;

    // 2. Customer Address
    await client.query(
      `INSERT INTO addresses (user_id, full_name, phone, address_line1, address_line2, city, state, postal_code, country, is_default, address_type)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, 'home')
       ON CONFLICT DO NOTHING`,
      [
        customerId,
        'John Doe',
        '+91 9123456780',
        'Flat 402, Royal Palms Residency',
        'Outer Ring Road, Bellandur',
        'Bengaluru',
        'Karnataka',
        '560103',
        'India',
      ],
    );

    // 3. Categories
    logger.info('Seeding categories...');
    const categoriesData = [
      {
        name: 'Living Room',
        slug: 'living-room',
        description: 'Handcrafted solid wood seating, sofas, lounge chairs, and center tables.',
        image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80',
        order: 1,
      },
      {
        name: 'Bedroom',
        slug: 'bedroom',
        description: 'Luxurious artisan beds, wardrobes, and bedside nightstands built to last generations.',
        image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80',
        order: 2,
      },
      {
        name: 'Dining & Kitchen',
        slug: 'dining-room',
        description: 'Solid teak and sheesham dining tables, chairs, and kitchen islands.',
        image: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80',
        order: 3,
      },
      {
        name: 'Decor & Storage',
        slug: 'decor-storage',
        description: 'Accent cabinets, handcrafted consoles, wall mirrors, and artisan shelving.',
        image: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
        order: 4,
      },
    ];

    const categoryMap = new Map<string, string>();
    for (const cat of categoriesData) {
      const res = await client.query(
        `INSERT INTO categories (name, slug, description, image_url, display_order)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
         RETURNING id, slug`,
        [cat.name, cat.slug, cat.description, cat.image, cat.order],
      );
      categoryMap.set(res.rows[0].slug, res.rows[0].id);
    }

    // 4. Products & Variants
    logger.info('Seeding products and variants...');
    const productsData = [
      {
        categorySlug: 'living-room',
        title: 'Aura Artisan 3-Seater Solid Wood Sofa',
        slug: 'aura-artisan-3-seater-sofa',
        sku: 'MF-LIV-001',
        short_description: 'Timeless comfort crafted from solid timber with upholstered high-density cushions.',
        description: 'The Aura Artisan Sofa combines mid-century minimalist architecture with traditional mortise-and-tenon joinery. Featuring gently curved armrests, woven strap back support, and premium fade-resistant fabric cushions. Built with sustainable solid wood for heirloom longevity.',
        base_price: 32999,
        compare_at_price: 39999,
        primary_material: 'Sheesham Wood',
        secondary_material: 'High-Density Foam & Premium Cotton Linen Upholstery',
        dimensions: '76 x 32 x 34 Inch',
        assembly_required: false,
        finish: 'Natural Honey Walnut Polish',
        dispatch_time: '2 to 3 Weeks',
        warranty: '3 Years Warranty',
        care_guide: 'Dust weekly with a dry microfiber cloth. Avoid direct sun exposure and sudden humidity changes. Use coasters for hot vessels.',
        is_featured: true,
        images: [
          { url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=800&q=80', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80', is_primary: false },
        ],
        variants: [
          { sku: 'MF-LIV-001-SH', title: 'Sheesham Wood / Honey Polish', wood_type: 'Sheesham Wood', size: '3-Seater', finish: 'Honey Polish', price: 32999, compare_at_price: 39999, stock: 12 },
          { sku: 'MF-LIV-001-TK', title: 'Teak Wood / Natural Matte', wood_type: 'Teak Wood', size: '3-Seater', finish: 'Natural Matte', price: 48999, compare_at_price: 56999, stock: 8 },
        ],
      },
      {
        categorySlug: 'living-room',
        title: 'Heritage Cane Back Armchair',
        slug: 'heritage-cane-back-armchair',
        sku: 'MF-LIV-002',
        short_description: 'Colonial-inspired lounge chair with handwoven natural rattan mesh and curved arms.',
        description: 'A striking statement armchair featuring breathable, natural cane woven by skilled artisans into a sturdy solid wood frame. Perfect for cozy reading nooks or living room accent seating.',
        base_price: 14999,
        compare_at_price: 18499,
        primary_material: 'Teak Wood',
        secondary_material: 'Natural Rattan Cane & Linen Cushion',
        dimensions: '28 x 30 x 36 Inch',
        assembly_required: false,
        finish: 'Warm Walnut Finish',
        dispatch_time: '10 to 14 Days',
        warranty: '1 Year Warranty',
        care_guide: 'Gently wipe the rattan weave with a lightly dampened cloth. Protect from excessive rain or moisture.',
        is_featured: true,
        images: [
          { url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1580481077195-c3a821a58875?auto=format&fit=crop&w=800&q=80', is_primary: false },
        ],
        variants: [
          { sku: 'MF-LIV-002-TK', title: 'Teak Wood / Walnut Finish', wood_type: 'Teak Wood', size: 'Standard Single', finish: 'Walnut Finish', price: 14999, compare_at_price: 18499, stock: 15 },
          { sku: 'MF-LIV-002-SH', title: 'Sheesham Wood / Teak Finish', wood_type: 'Sheesham Wood', size: 'Standard Single', finish: 'Teak Finish', price: 11999, compare_at_price: 14999, stock: 20 },
        ],
      },
      {
        categorySlug: 'bedroom',
        title: 'Serenade Solid Teak King Platform Bed',
        slug: 'serenade-solid-teak-king-platform-bed',
        sku: 'MF-BED-001',
        short_description: 'Low-profile solid teak platform bed with slatted ergonomic headboard.',
        description: 'The Serenade Platform Bed celebrates the organic natural grain of old-growth plantation teak. Sourced sustainably, each plank is hand-planed and assembled with concealed heavy-duty steel bracing and solid wood slats for supreme mattress ventilation and zero squeaks.',
        base_price: 49999,
        compare_at_price: 59999,
        primary_material: 'Teak Wood',
        secondary_material: 'Commercial Grade Birch Plywood Base Slats',
        dimensions: '78 x 72 x 40 Inch (King Size)',
        assembly_required: true,
        finish: 'Natural Teak Protective Oil Finish',
        dispatch_time: '3 to 4 Weeks',
        warranty: '5 Years Warranty',
        care_guide: 'Tighten assembly bolts annually. Reapply teak conditioning oil every 2 years to enhance luster.',
        is_featured: true,
        images: [
          { url: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=800&q=80', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1540518614846-7ede433c4b49?auto=format&fit=crop&w=800&q=80', is_primary: false },
        ],
        variants: [
          { sku: 'MF-BED-001-K', title: 'King Size (78x72) / Teak Wood', wood_type: 'Teak Wood', size: 'King', finish: 'Natural Oil', price: 49999, compare_at_price: 59999, stock: 6 },
          { sku: 'MF-BED-001-Q', title: 'Queen Size (78x60) / Teak Wood', wood_type: 'Teak Wood', size: 'Queen', finish: 'Natural Oil', price: 44999, compare_at_price: 52999, stock: 10 },
        ],
      },
      {
        categorySlug: 'bedroom',
        title: 'Linear 2-Drawer Minimalist Nightstand',
        slug: 'linear-2-drawer-minimalist-nightstand',
        sku: 'MF-BED-002',
        short_description: 'Compact bedside companion with soft-close solid wood drawers and brass handles.',
        description: 'Designed to complement modern and classic bedroom aesthetics alike, the Linear Nightstand features full-extension undermount runners, dovetail jointed solid drawers, and antiqued brass pull handles.',
        base_price: 7999,
        compare_at_price: 9499,
        primary_material: 'Sheesham Wood',
        secondary_material: 'Solid Brass Hardware',
        dimensions: '18 x 16 x 22 Inch',
        assembly_required: false,
        finish: 'Deep Espresso Walnut',
        dispatch_time: '1 to 2 Weeks',
        warranty: '1 Year Warranty',
        care_guide: 'Wipe surface with a clean lint-free cloth. Do not use chemical solvent sprays.',
        is_featured: false,
        images: [
          { url: 'https://images.unsplash.com/photo-1532372320572-cda25653a26d?auto=format&fit=crop&w=800&q=80', is_primary: true },
        ],
        variants: [
          { sku: 'MF-BED-002-SH', title: 'Sheesham Wood / Espresso', wood_type: 'Sheesham Wood', size: 'Standard', finish: 'Espresso Walnut', price: 7999, compare_at_price: 9499, stock: 25 },
        ],
      },
      {
        categorySlug: 'dining-room',
        title: 'Harvest 6-Seater Solid Sheesham Dining Set',
        slug: 'harvest-6-seater-dining-set',
        sku: 'MF-DIN-001',
        short_description: 'Complete family dining ensemble including 1 generous dining table and 6 cushioned chairs.',
        description: 'Make family mealtimes extraordinary with the Harvest 6-Seater Dining Set. Featuring a massive 1.5-inch thick solid sheesham tabletop with live-edge inspired contours and 6 ergonomic dining chairs with stain-resistant padded cushions.',
        base_price: 45999,
        compare_at_price: 54999,
        primary_material: 'Sheesham Wood',
        secondary_material: 'High-Density Sponge & Textured Jute Fabric',
        dimensions: '66 x 36 x 30 Inch (Table)',
        assembly_required: true,
        finish: 'Warm Honey Polish',
        dispatch_time: '2 to 3 Weeks',
        warranty: '3 Years Warranty',
        care_guide: 'Use dining table mats. Clean spills promptly with a dry cloth.',
        is_featured: true,
        images: [
          { url: 'https://images.unsplash.com/photo-1617806118233-18e1de247200?auto=format&fit=crop&w=800&q=80', is_primary: true },
          { url: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=800&q=80', is_primary: false },
        ],
        variants: [
          { sku: 'MF-DIN-001-6S', title: '6-Seater Set / Sheesham Wood', wood_type: 'Sheesham Wood', size: '6-Seater', finish: 'Warm Honey', price: 45999, compare_at_price: 54999, stock: 5 },
          { sku: 'MF-DIN-001-4S', title: '4-Seater Compact / Sheesham Wood', wood_type: 'Sheesham Wood', size: '4-Seater', finish: 'Warm Honey', price: 34999, compare_at_price: 41999, stock: 8 },
        ],
      },
      {
        categorySlug: 'decor-storage',
        title: 'Royal Jharokha Carved Wall Mirror',
        slug: 'royal-jharokha-carved-wall-mirror',
        sku: 'MF-DEC-001',
        short_description: 'Traditional arched decorative wall mirror hand-carved with floral motifs.',
        description: 'A tribute to classical Indian royal palace balconies, this ornamental wall mirror is hand-carved by master wood carvers in solid mango and reclaimed teak wood. Features functional shutter doors that swing open to reveal a crystal-clear distortion-free mirror.',
        base_price: 8499,
        compare_at_price: 10999,
        primary_material: 'Mango Wood',
        secondary_material: '5mm Saint-Gobain Distortion-Free Glass',
        dimensions: '24 x 4 x 36 Inch',
        assembly_required: false,
        finish: 'Distressed Antique White & Natural Wood',
        dispatch_time: '7 to 10 Days',
        warranty: '1 Year Warranty',
        care_guide: 'Clean mirror glass with standard glass cleaner. Dust frame with dry soft brush.',
        is_featured: false,
        images: [
          { url: 'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80', is_primary: true },
        ],
        variants: [
          { sku: 'MF-DEC-001-AW', title: 'Antique White Finish', wood_type: 'Mango Wood', size: '36 Inch Height', finish: 'Distressed Antique White', price: 8499, compare_at_price: 10999, stock: 18 },
          { sku: 'MF-DEC-001-NT', title: 'Natural Teak Finish', wood_type: 'Mango Wood', size: '36 Inch Height', finish: 'Natural Teak', price: 8499, compare_at_price: 10999, stock: 15 },
        ],
      },
    ];

    for (const p of productsData) {
      const categoryId = categoryMap.get(p.categorySlug);
      if (!categoryId) continue;

      const prodRes = await client.query(
        `INSERT INTO products (
          category_id, title, slug, sku, short_description, description,
          base_price, compare_at_price, primary_material, secondary_material,
          dimensions, assembly_required, finish, dispatch_time, warranty,
          care_guide, is_featured, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, base_price = EXCLUDED.base_price
        RETURNING id`,
        [
          categoryId,
          p.title,
          p.slug,
          p.sku,
          p.short_description,
          p.description,
          p.base_price,
          p.compare_at_price,
          p.primary_material,
          p.secondary_material,
          p.dimensions,
          p.assembly_required,
          p.finish,
          p.dispatch_time,
          p.warranty,
          p.care_guide,
          p.is_featured,
        ],
      );
      const productId = prodRes.rows[0].id;

      // Seed Images
      for (let idx = 0; idx < p.images.length; idx++) {
        const img = p.images[idx];
        await client.query(
          `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, display_order)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT DO NOTHING`,
          [productId, img.url, p.title, img.is_primary, idx],
        );
      }

      // Seed Variants
      for (const v of p.variants) {
        const varRes = await client.query(
          `INSERT INTO product_variants (
            product_id, sku, title, wood_type, size, finish,
            price, compare_at_price, stock_quantity, is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
          ON CONFLICT (sku) DO UPDATE SET price = EXCLUDED.price, stock_quantity = EXCLUDED.stock_quantity
          RETURNING id`,
          [
            productId,
            v.sku,
            v.title,
            v.wood_type,
            v.size,
            v.finish,
            v.price,
            v.compare_at_price,
            v.stock,
          ],
        );

        // Seed Inventory
        await client.query(
          `INSERT INTO inventory (variant_id, quantity)
           VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [varRes.rows[0].id, v.stock],
        );
      }

      // Seed Sample Review
      await client.query(
        `INSERT INTO reviews (product_id, user_id, rating, title, comment, is_verified_purchase, status)
         VALUES ($1, $2, $3, $4, $5, true, 'approved')
         ON CONFLICT DO NOTHING`,
        [
          productId,
          customerId,
          5,
          'Exceptional solid wood craftsmanship!',
          'Arrived completely damage-free with incredible packaging. The solid wood weight and grain finish are far superior to particle-board store furniture.',
        ],
      );
    }

    await client.query('COMMIT');
    logger.info('🎉 Database seeding completed successfully.');
  } catch (error: any) {
    await client.query('ROLLBACK');
    logger.error('❌ Seeding failed:', error.message || error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
};

/**
 * Idempotent seed helper: checks if the database already has product data.
 * If empty and in development, executes initial seeding.
 */
export const seedIfEmpty = async (): Promise<void> => {
  const unpooledUrl = getUnpooledDatabaseUrl();
  const pool = new Pool({
    connectionString: unpooledUrl,
    ssl: { rejectUnauthorized: true },
    max: 1,
    connectionTimeoutMillis: 10000,
  });

  try {
    const seeded = await isDatabaseSeeded(pool);
    if (seeded) {
      logger.info('📦 Database tables already contain data. Skipping initial seeding.');
      return;
    }
    logger.info('🌱 Database is empty. Running initial development seed...');
    await runSeed();
  } finally {
    await pool.end();
  }
};

if (require.main === module) {
  runSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
