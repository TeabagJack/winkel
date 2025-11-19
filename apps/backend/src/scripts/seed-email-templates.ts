import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
  {
    name: 'order-confirmation',
    subject: 'Order Confirmation - {{orderNumber}}',
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="color: #2563eb; margin: 0;">Order Confirmation</h1>
  </div>

  <p>Dear {{customerName}},</p>

  <p>Thank you for your order! We've received your order and it's being processed.</p>

  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h2 style="margin-top: 0;">Order Details</h2>
    <p><strong>Order Number:</strong> {{orderNumber}}</p>
    <p><strong>Order Date:</strong> {{orderDate}}</p>
    <p><strong>Total Amount:</strong> ${{orderTotal}}</p>
  </div>

  <p>You can track your order status by logging into your account.</p>

  <p>If you have any questions, please don't hesitate to contact us.</p>

  <p>Best regards,<br>
  B2B E-commerce Team</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="font-size: 12px; color: #6b7280;">This is an automated email. Please do not reply to this message.</p>
</body>
</html>
    `,
    textBody: `Order Confirmation

Dear {{customerName}},

Thank you for your order! We've received your order and it's being processed.

Order Details:
- Order Number: {{orderNumber}}
- Order Date: {{orderDate}}
- Total Amount: ${{orderTotal}}

You can track your order status by logging into your account.

If you have any questions, please don't hesitate to contact us.

Best regards,
B2B E-commerce Team

---
This is an automated email. Please do not reply to this message.`,
    variables: {
      customerName: 'Customer name',
      orderNumber: 'Order number',
      orderDate: 'Order date',
      orderTotal: 'Order total amount',
    },
  },
  {
    name: 'low-stock-alert',
    subject: 'Low Stock Alert - {{productName}}',
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Low Stock Alert</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #fef3c7; padding: 20px; border-radius: 5px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
    <h1 style="color: #92400e; margin: 0;">⚠️ Low Stock Alert</h1>
  </div>

  <p>The following product is running low on stock:</p>

  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <h2 style="margin-top: 0; color: #dc2626;">{{productName}}</h2>
    <p><strong>SKU:</strong> {{productSku}}</p>
    <p><strong>Current Stock:</strong> <span style="color: #dc2626; font-weight: bold;">{{currentStock}}</span></p>
    <p><strong>Low Stock Threshold:</strong> {{threshold}}</p>
  </div>

  <p><strong>Action Required:</strong> Consider restocking this product to avoid stockouts.</p>

  <p>You can manage inventory from your admin dashboard.</p>

  <p>Best regards,<br>
  B2B E-commerce System</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="font-size: 12px; color: #6b7280;">This is an automated alert from your inventory management system.</p>
</body>
</html>
    `,
    textBody: `⚠️ LOW STOCK ALERT

The following product is running low on stock:

Product: {{productName}}
SKU: {{productSku}}
Current Stock: {{currentStock}}
Low Stock Threshold: {{threshold}}

ACTION REQUIRED: Consider restocking this product to avoid stockouts.

You can manage inventory from your admin dashboard.

Best regards,
B2B E-commerce System

---
This is an automated alert from your inventory management system.`,
    variables: {
      productName: 'Product name',
      productSku: 'Product SKU',
      currentStock: 'Current stock level',
      threshold: 'Low stock threshold',
    },
  },
  {
    name: 'welcome',
    subject: 'Welcome to Our B2B Platform',
    htmlBody: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
    <h1 style="margin: 0;">Welcome to Our Platform!</h1>
  </div>

  <p>Dear {{userName}},</p>

  <p>Welcome to our B2B E-commerce Platform! We're excited to have you on board.</p>

  <p>Your account has been successfully created and you can now:</p>

  <ul>
    <li>Browse our complete product catalog</li>
    <li>Place orders 24/7</li>
    <li>Track your order status in real-time</li>
    <li>Access exclusive B2B pricing</li>
    <li>Manage your company profile</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="{{platformUrl}}" style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
  </div>

  <p>If you have any questions or need assistance, our support team is here to help.</p>

  <p>Best regards,<br>
  B2B E-commerce Team</p>

  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">

  <p style="font-size: 12px; color: #6b7280;">This email was sent to {{userEmail}}. If you didn't create this account, please contact us immediately.</p>
</body>
</html>
    `,
    textBody: `WELCOME TO OUR PLATFORM!

Dear {{userName}},

Welcome to our B2B E-commerce Platform! We're excited to have you on board.

Your account has been successfully created and you can now:

- Browse our complete product catalog
- Place orders 24/7
- Track your order status in real-time
- Access exclusive B2B pricing
- Manage your company profile

Get started: {{platformUrl}}

If you have any questions or need assistance, our support team is here to help.

Best regards,
B2B E-commerce Team

---
This email was sent to {{userEmail}}. If you didn't create this account, please contact us immediately.`,
    variables: {
      userName: 'User name',
      userEmail: 'User email',
      platformUrl: 'Platform URL',
    },
  },
];

async function seedTemplates() {
  console.log('Seeding email templates...');

  for (const template of templates) {
    await prisma.emailTemplate.upsert({
      where: { name: template.name },
      update: template,
      create: template,
    });
    console.log(`✓ Created/updated template: ${template.name}`);
  }

  console.log('Email templates seeded successfully!');
}

seedTemplates()
  .catch((error) => {
    console.error('Error seeding templates:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
