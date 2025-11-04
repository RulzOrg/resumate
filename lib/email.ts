/**
 * Email Service with Resend
 * Handles sending emails for the resume optimization lead magnet
 */

import { Resend } from 'resend';
import { OptimizedResumeEmail } from '@/emails/OptimizedResumeEmail';

const resend = new Resend(process.env.RESEND_API_KEY);

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
 * @param params - Email parameters
 * @returns Promise with success status
 */
export async function sendOptimizedResumeEmail({
  email,
  downloadUrl,
  improvements,
  expiresInDays = 7,
}: SendOptimizedResumeEmailParams): Promise<EmailResponse> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resumate.com';
  const fromName = 'John';

  if (!process.env.RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Your ATS-Optimized Resume is Ready! 🚀',
      react: OptimizedResumeEmail({
        downloadUrl,
        improvements,
        expiresInDays,
      }),
    });

    if (error) {
      console.error('[Email] Failed to send email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    console.log('[Email] Successfully sent email to:', email, 'ID:', data?.id);
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[Email] Error sending email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Send welcome email for new lead magnet users
 * @param email - Recipient email
 * @returns Promise with success status
 */
export async function sendWelcomeEmail(email: string): Promise<EmailResponse> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resumate.com';
  const fromName = 'John';

  if (!process.env.RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY not configured');
    return {
      success: false,
      error: 'Email service not configured',
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Welcome! Your Resume is Being Optimized',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Thanks for using our Resume Builder!</h1>
          <p>We're currently optimizing your resume to make it ATS-friendly.</p>
          <p>You'll receive another email in a few minutes with your optimized resume and a detailed breakdown of improvements.</p>
          <p>Best,<br>John</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send welcome email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    console.log(
      '[Email] Successfully sent welcome email to:',
      email,
      'ID:',
      data?.id
    );
    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[Email] Error sending welcome email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
