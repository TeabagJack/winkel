import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { EmailService } from '../services/email.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class EmailController {
  /**
   * Get email preferences for current user
   */
  async getPreferences(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const preferences = await EmailService.getEmailPreferences(req.user.id);

    res.json({
      success: true,
      data: preferences,
    });
  }

  /**
   * Update email preferences
   */
  async updatePreferences(req: AuthRequest, res: Response): Promise<void> {
    if (!req.user?.id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const updates = req.body;

    const preferences = await EmailService.updateEmailPreferences(
      req.user.id,
      updates
    );

    res.json({
      success: true,
      message: 'Email preferences updated successfully',
      data: preferences,
    });
  }

  /**
   * Get email queue stats (admin only)
   */
  async getQueueStats(req: AuthRequest, res: Response): Promise<void> {
    const stats = await EmailService.getQueueStats();

    res.json({
      success: true,
      data: stats,
    });
  }

  /**
   * Get email templates (admin only)
   */
  async getTemplates(req: AuthRequest, res: Response): Promise<void> {
    const templates = await prisma.emailTemplate.findMany({
      select: {
        id: true,
        name: true,
        subject: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: templates,
    });
  }

  /**
   * Get a single template (admin only)
   */
  async getTemplate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    const template = await prisma.emailTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    res.json({
      success: true,
      data: template,
    });
  }

  /**
   * Create email template (admin only)
   */
  async createTemplate(req: AuthRequest, res: Response): Promise<void> {
    const { name, subject, htmlBody, textBody, variables } = req.body;

    const template = await prisma.emailTemplate.create({
      data: {
        name,
        subject,
        htmlBody,
        textBody,
        variables,
      },
    });

    res.status(201).json({
      success: true,
      message: 'Template created successfully',
      data: template,
    });
  }

  /**
   * Update email template (admin only)
   */
  async updateTemplate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;
    const updates = req.body;

    const template = await prisma.emailTemplate.update({
      where: { id },
      data: updates,
    });

    res.json({
      success: true,
      message: 'Template updated successfully',
      data: template,
    });
  }

  /**
   * Delete email template (admin only)
   */
  async deleteTemplate(req: AuthRequest, res: Response): Promise<void> {
    const { id } = req.params;

    await prisma.emailTemplate.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Template deleted successfully',
    });
  }

  /**
   * Send test email (admin only)
   */
  async sendTestEmail(req: AuthRequest, res: Response): Promise<void> {
    const { templateId, to, variables } = req.body;

    const template = await prisma.emailTemplate.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      res.status(404).json({ success: false, message: 'Template not found' });
      return;
    }

    await EmailService.sendTemplatedEmail(template.name, to, variables || {});

    res.json({
      success: true,
      message: 'Test email queued successfully',
    });
  }

  /**
   * Process email queue (admin only)
   */
  async processQueue(req: AuthRequest, res: Response): Promise<void> {
    await EmailService.processQueue();

    res.json({
      success: true,
      message: 'Email queue processed',
    });
  }

  /**
   * Get email queue items (admin only)
   */
  async getQueueItems(req: AuthRequest, res: Response): Promise<void> {
    const { status, page = 1, pageSize = 20 } = req.query;

    const skip = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const take = parseInt(pageSize as string);

    const [items, total] = await Promise.all([
      prisma.emailQueue.findMany({
        where: status ? { status: status as any } : undefined,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.emailQueue.count({
        where: status ? { status: status as any } : undefined,
      }),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page: parseInt(page as string),
        pageSize: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  }
}
