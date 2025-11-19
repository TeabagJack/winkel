import { PrismaClient, EmailStatus } from '@prisma/client';
import { logger } from '../utils/logger.js';
import nodemailer from 'nodemailer';

const prisma = new PrismaClient();

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter;

  /**
   * Initialize email service
   */
  static initialize() {
    // Configure with environment variables
    const config = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    this.transporter = nodemailer.createTransporter(config);
    logger.info('Email service initialized');
  }

  /**
   * Queue an email for sending
   */
  static async queueEmail(options: EmailOptions): Promise<void> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    for (const recipient of recipients) {
      await prisma.emailQueue.create({
        data: {
          to: recipient,
          subject: options.subject,
          htmlBody: options.html,
          textBody: options.text,
          ...(options.templateId && { templateId: options.templateId }),
        },
      });
    }

    logger.info(`Queued ${recipients.length} emails`);
  }

  /**
   * Process pending emails in queue
   */
  static async processQueue(): Promise<void> {
    const pendingEmails = await prisma.emailQueue.findMany({
      where: {
        status: EmailStatus.PENDING,
        attempts: { lt: prisma.emailQueue.fields.maxAttempts },
      },
      take: 10, // Process 10 at a time
    });

    for (const email of pendingEmails) {
      await this.sendQueuedEmail(email.id);
    }

    logger.info(`Processed ${pendingEmails.length} emails from queue`);
  }

  /**
   * Send a queued email
   */
  private static async sendQueuedEmail(emailId: string): Promise<void> {
    const email = await prisma.emailQueue.findUnique({
      where: { id: emailId },
    });

    if (!email) return;

    try {
      // Increment attempts
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: { attempts: { increment: 1 } },
      });

      // Send email
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"B2B Platform" <noreply@example.com>',
        to: email.to,
        subject: email.subject,
        html: email.htmlBody,
        text: email.textBody || undefined,
      });

      // Mark as sent
      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      logger.info(`Email sent to ${email.to}`);
    } catch (error: any) {
      logger.error(`Failed to send email ${emailId}:`, error);

      // Update with error
      const attempts = email.attempts + 1;
      const status =
        attempts >= email.maxAttempts ? EmailStatus.FAILED : EmailStatus.PENDING;

      await prisma.emailQueue.update({
        where: { id: emailId },
        data: {
          status,
          error: error.message,
        },
      });
    }
  }

  /**
   * Send email immediately (bypass queue)
   */
  static async sendImmediate(options: EmailOptions): Promise<void> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    for (const recipient of recipients) {
      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"B2B Platform" <noreply@example.com>',
        to: recipient,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    }

    logger.info(`Sent ${recipients.length} emails immediately`);
  }

  /**
   * Render email template
   */
  static async renderTemplate(
    templateName: string,
    variables: Record<string, any>
  ): Promise<{ subject: string; html: string; text: string }> {
    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName, isActive: true },
    });

    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    // Simple template variable replacement
    let subject = template.subject;
    let html = template.htmlBody;
    let text = template.textBody;

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      subject = subject.replace(placeholder, String(value));
      html = html.replace(placeholder, String(value));
      text = text.replace(placeholder, String(value));
    }

    return { subject, html, text };
  }

  /**
   * Send templated email
   */
  static async sendTemplatedEmail(
    templateName: string,
    to: string | string[],
    variables: Record<string, any>
  ): Promise<void> {
    const rendered = await this.renderTemplate(templateName, variables);

    const template = await prisma.emailTemplate.findUnique({
      where: { name: templateName },
      select: { id: true },
    });

    await this.queueEmail({
      to,
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      templateId: template?.id,
    });
  }

  /**
   * Check user email preferences
   */
  static async canSendEmail(
    userId: string,
    emailType: keyof EmailPreferences
  ): Promise<boolean> {
    const preferences = await prisma.emailPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Default to true if no preferences set
      return true;
    }

    return preferences[emailType] as boolean;
  }

  /**
   * Get or create email preferences
   */
  static async getEmailPreferences(userId: string) {
    let preferences = await prisma.emailPreference.findUnique({
      where: { userId },
    });

    if (!preferences) {
      // Create default preferences
      preferences = await prisma.emailPreference.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update email preferences
   */
  static async updateEmailPreferences(
    userId: string,
    updates: Partial<EmailPreferences>
  ) {
    return await prisma.emailPreference.upsert({
      where: { userId },
      update: updates,
      create: {
        userId,
        ...updates,
      },
    });
  }

  /**
   * Get email queue stats
   */
  static async getQueueStats() {
    const [pending, sent, failed, total] = await Promise.all([
      prisma.emailQueue.count({ where: { status: EmailStatus.PENDING } }),
      prisma.emailQueue.count({ where: { status: EmailStatus.SENT } }),
      prisma.emailQueue.count({ where: { status: EmailStatus.FAILED } }),
      prisma.emailQueue.count(),
    ]);

    return {
      pending,
      sent,
      failed,
      total,
      successRate: total > 0 ? (sent / total) * 100 : 0,
    };
  }

  // Convenience methods for common emails
  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(userId: string, orderData: any) {
    if (await this.canSendEmail(userId, 'orderConfirmation')) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) return;

      await this.sendTemplatedEmail('order-confirmation', user.email, {
        customerName: `${user.firstName} ${user.lastName}`,
        orderNumber: orderData.orderNumber,
        orderTotal: orderData.total,
        orderDate: orderData.createdAt,
      });
    }
  }

  /**
   * Send low stock alert
   */
  static async sendLowStockAlert(productData: any) {
    // Send to all admins
    const admins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
    });

    const recipients = admins
      .filter(async (admin) => await this.canSendEmail(admin.id, 'lowStockAlert'))
      .map((admin) => admin.email);

    if (recipients.length > 0) {
      await this.sendTemplatedEmail('low-stock-alert', recipients, {
        productName: productData.name,
        productSku: productData.sku,
        currentStock: productData.quantity,
        threshold: productData.lowStockAlert,
      });
    }
  }
}

interface EmailPreferences {
  orderConfirmation: boolean;
  orderShipped: boolean;
  orderDelivered: boolean;
  lowStockAlert: boolean;
  promotions: boolean;
  newsletter: boolean;
}

// Initialize on import
if (process.env.SMTP_USER) {
  EmailService.initialize();
}
