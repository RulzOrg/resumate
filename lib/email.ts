/**
 * Email Service with Resend
 * Handles sending emails (simplified for MVP)
 */

import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

interface SendOptimizedResumeEmailParams {
  email: string;
  downloadUrl: string;
  improvements: {
    title: string;
    description: string;
  }[];
  expiresInDays?: number;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send optimized resume email with download link
 */
export async function sendOptimizedResumeEmail({
  email,
  downloadUrl,
  improvements,
  expiresInDays = 7,
}: SendOptimizedResumeEmailParams): Promise<EmailResponse> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resumate.com';
  const fromName = 'ResuMate';

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured - skipping email send');
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
    };
  }

  try {
    const improvementsList = improvements
      .map(imp => `<li><strong>${imp.title}:</strong> ${imp.description}</li>`)
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your Optimized Resume is Ready!</h2>
        <p>Great news! We've successfully optimized your resume.</p>

        <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <a href="${downloadUrl}" 
             style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Download Your Optimized Resume
          </a>
        </div>

        <h3>Key Improvements:</h3>
        <ul>${improvementsList}</ul>

        <p style="color: #666; font-size: 0.9em;">
          This download link will expire in ${expiresInDays} days.
        </p>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Your Optimized Resume is Ready!',
      html: htmlContent,
    });

    if (error) {
      console.error('[Email] Send error:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error: any) {
    console.error('[Email] Exception:', error);
    return {
      success: false,
      error: error.message || 'Unknown error',
    };
  }
}

/**
 * Send a simple notification email
 */
export async function sendNotificationEmail(
  to: string,
  subject: string,
  html: string,
  replyTo?: string
): Promise<EmailResponse> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resumate.com';
  const fromName = 'ResuMate';

  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured - skipping email send');
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to,
      subject,
      html,
      reply_to: replyTo,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, messageId: data?.id };
  } catch (error: any) {
    return { success: false, error: error.message || 'Unknown error' };
  }
}
