import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Super Admin User
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@winkel.com' },
    update: {},
    create: {
      email: 'admin@winkel.com',
      password: adminPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log('✅ Created admin user:', admin.email);

  // Create sample company
  const company = await prisma.company.upsert({
    where: { taxId: 'TAX-123456789' },
    update: {},
    create: {
      name: 'Acme Corporation',
      legalName: 'Acme Corporation LLC',
      taxId: 'TAX-123456789',
      email: 'contact@acme.com',
      phone: '+1-555-0100',
      status: 'ACTIVE',
      paymentTerms: 'NET_30',
      creditLimit: 50000,
      currentCredit: 0,
    },
  });

  console.log('✅ Created company:', company.name);

  // Create company admin
  const companyAdminPassword = await bcrypt.hash('buyer123', 10);

  const companyAdmin = await prisma.user.upsert({
    where: { email: 'buyer@acme.com' },
    update: {},
    create: {
      email: 'buyer@acme.com',
      password: companyAdminPassword,
      firstName: 'John',
      lastName: 'Buyer',
      role: 'COMPANY_ADMIN',
      status: 'ACTIVE',
      companyId: company.id,
    },
  });

  console.log('✅ Created company admin:', companyAdmin.email);

  // Create address for company
  const address = await prisma.address.create({
    data: {
      companyId: company.id,
      type: 'both',
      isDefault: true,
      label: 'Main Office',
      firstName: 'John',
      lastName: 'Buyer',
      company: 'Acme Corporation',
      addressLine1: '123 Business Street',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      phone: '+1-555-0100',
    },
  });

  console.log('✅ Created address');

  // Create categories
  const electronicsCategory = await prisma.category.create({
    data: {
      name: 'Electronics',
      slug: 'electronics',
      description: 'Electronic devices and accessories',
      isActive: true,
    },
  });

  const officeCategory = await prisma.category.create({
    data: {
      name: 'Office Supplies',
      slug: 'office-supplies',
      description: 'Office equipment and supplies',
      isActive: true,
    },
  });

  console.log('✅ Created categories');

  // Create sample products
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: 'LAPTOP-001',
        name: 'Professional Laptop',
        description: 'High-performance business laptop with 16GB RAM and 512GB SSD',
        shortDescription: 'Business laptop with excellent performance',
        categoryId: electronicsCategory.id,
        basePrice: 1299.99,
        compareAtPrice: 1499.99,
        cost: 900,
        status: 'ACTIVE',
        quantity: 50,
        lowStockAlert: 10,
        trackInventory: true,
        allowBackorder: false,
        isActive: true,
        isFeatured: true,
        images: {
          create: [
            {
              url: 'https://via.placeholder.com/800x600/4A90E2/ffffff?text=Laptop',
              altText: 'Professional Laptop',
              sortOrder: 0,
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        sku: 'MOUSE-001',
        name: 'Wireless Mouse',
        description: 'Ergonomic wireless mouse with precision tracking',
        shortDescription: 'Comfortable wireless mouse',
        categoryId: electronicsCategory.id,
        basePrice: 29.99,
        compareAtPrice: 39.99,
        cost: 15,
        status: 'ACTIVE',
        quantity: 200,
        lowStockAlert: 50,
        trackInventory: true,
        allowBackorder: true,
        isActive: true,
        images: {
          create: [
            {
              url: 'https://via.placeholder.com/800x600/50C878/ffffff?text=Mouse',
              altText: 'Wireless Mouse',
              sortOrder: 0,
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        sku: 'DESK-001',
        name: 'Standing Desk',
        description: 'Adjustable standing desk with electric height control',
        shortDescription: 'Ergonomic standing desk',
        categoryId: officeCategory.id,
        basePrice: 599.99,
        cost: 350,
        status: 'ACTIVE',
        quantity: 25,
        lowStockAlert: 5,
        trackInventory: true,
        allowBackorder: false,
        isActive: true,
        isFeatured: true,
        images: {
          create: [
            {
              url: 'https://via.placeholder.com/800x600/FFB347/ffffff?text=Desk',
              altText: 'Standing Desk',
              sortOrder: 0,
            },
          ],
        },
      },
    }),
    prisma.product.create({
      data: {
        sku: 'CHAIR-001',
        name: 'Ergonomic Office Chair',
        description: 'Premium ergonomic office chair with lumbar support',
        shortDescription: 'Comfortable office chair',
        categoryId: officeCategory.id,
        basePrice: 399.99,
        compareAtPrice: 499.99,
        cost: 200,
        status: 'ACTIVE',
        quantity: 40,
        lowStockAlert: 10,
        trackInventory: true,
        allowBackorder: true,
        isActive: true,
        images: {
          create: [
            {
              url: 'https://via.placeholder.com/800x600/9B59B6/ffffff?text=Chair',
              altText: 'Office Chair',
              sortOrder: 0,
            },
          ],
        },
      },
    }),
  ]);

  console.log(`✅ Created ${products.length} products`);

  // Create pricing tier
  const tier = await prisma.pricingTier.create({
    data: {
      name: 'Gold Tier',
      description: '10% discount on all products',
      discount: 10,
    },
  });

  // Update company with pricing tier
  await prisma.company.update({
    where: { id: company.id },
    data: { pricingTierId: tier.id },
  });

  console.log('✅ Created pricing tier and assigned to company');

  // Create volume pricing for laptop
  await prisma.pricingRule.create({
    data: {
      productId: products[0].id,
      companyId: company.id,
      minQuantity: 10,
      maxQuantity: 49,
      price: 1199.99,
      isActive: true,
    },
  });

  await prisma.pricingRule.create({
    data: {
      productId: products[0].id,
      companyId: company.id,
      minQuantity: 50,
      price: 1099.99,
      isActive: true,
    },
  });

  console.log('✅ Created volume pricing rules');

  console.log('\n🎉 Database seeded successfully!\n');
  console.log('Login credentials:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Admin:');
  console.log('  Email: admin@winkel.com');
  console.log('  Password: admin123');
  console.log('');
  console.log('Company Admin/Buyer:');
  console.log('  Email: buyer@acme.com');
  console.log('  Password: buyer123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
