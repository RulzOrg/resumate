/**
 * Email Service with Resend
 * Handles sending emails for the resume optimization lead magnet
 */

import { Resend } from 'resend';
// Temporarily comment out email template to test the flow
// import { OptimizedResumeEmail } from '@/emails/OptimizedResumeEmail';

// Initialize Resend only if API key is available, otherwise use null
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
    console.warn('[Email] RESEND_API_KEY not configured - skipping email send');
    // Return success but log that email was not actually sent
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
      error: undefined,
    };
  }

  try {
    // Create a simple HTML email for testing
    const improvementsList = improvements
      .map(imp => `<li><strong>${imp.title}:</strong> ${imp.description}</li>`)
      .join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your ATS-Optimized Resume is Ready!</h2>
        <p>Great news! We've successfully optimized your resume for ATS compatibility.</p>

        <div style="background: #f0f0f0; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <a href="${downloadUrl}" style="display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 4px;">
            Download Your Optimized Resume
          </a>
          <p style="color: #666; font-size: 14px; margin-top: 10px;">
            This link expires in ${expiresInDays} days
          </p>
        </div>

        <h3>Key Improvements Made:</h3>
        <ul>${improvementsList}</ul>

        <p style="margin-top: 20px;">
          <strong>Want to optimize for specific jobs?</strong><br>
          <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/auth/signup">
            Create a free account
          </a> to tailor your resume for multiple job applications.
        </p>
      </div>
    `;

    // If resend is not initialized, we already returned success above
    if (!resend) {
      // This shouldn't happen since we check RESEND_API_KEY above, but just in case
      console.warn('[Email] Resend client not initialized');
      return {
        success: true,
        messageId: 'mock-' + Date.now(),
      };
    }

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: email,
      subject: 'Your ATS-Optimized Resume is Ready! 🚀',
      html: htmlContent,
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
    console.warn('[Email] RESEND_API_KEY not configured - skipping email send');
    // Return success but log that email was not actually sent
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
      error: undefined,
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

/**
 * Send support email from contact form
 * @param params - Support email parameters
 * @returns Promise with success status
 */
export async function sendSupportEmail({
  name,
  email,
  subject,
  message,
}: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<EmailResponse> {
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@resumate.com';
  // Send to the support email address (or the sender themselves if testing)
  // In production, this should go to your support inbox
  const supportEmail = process.env.SUPPORT_EMAIL || fromEmail;

  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not configured - skipping support email');
    return {
      success: true,
      messageId: 'mock-' + Date.now(),
    };
  }

  try {
    const { data, error } = await resend!.emails.send({
      from: `Support Form <${fromEmail}>`,
      to: supportEmail,
      replyTo: email,
      subject: `[Support] ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>New Support Message</h2>
          <p><strong>From:</strong> ${name} (${email})</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <h3>Message:</h3>
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Email] Failed to send support email:', error);
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }

    return {
      success: true,
      messageId: data?.id,
    };
  } catch (error) {
    console.error('[Email] Error sending support email:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
