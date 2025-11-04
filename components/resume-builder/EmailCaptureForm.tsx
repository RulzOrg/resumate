/**
 * Email Capture Form Component
 * Collects email to send optimized resume
 */

'use client';

import { useState } from 'react';
import { Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface EmailCaptureFormProps {
  uploadId: string;
  fileName: string;
  onSubmitSuccess: (data: {
    downloadUrl: string;
    improvements: Array<{ title: string; description: string }>;
    score: number;
  }) => void;
  onError: (error: string) => void;
}

export function EmailCaptureForm({
  uploadId,
  fileName,
  onSubmitSuccess,
  onError,
}: EmailCaptureFormProps) {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailError, setEmailError] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Clear error when user starts typing
    if (emailError) {
      setEmailError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email) {
      setEmailError('Email is required');
      return;
    }

    if (!validateEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `/api/public/resume-optimize/${uploadId}/submit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        onSubmitSuccess({
          downloadUrl: result.data.downloadUrl,
          improvements: result.data.improvements,
          score: result.data.score,
        });
      } else {
        onError(result.error || 'Optimization failed. Please try again.');
      }
    } catch (error) {
      console.error('Submit error:', error);
      onError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-8 border border-blue-200 dark:border-blue-800">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Get Your Optimized Resume
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter your email to receive your ATS-optimized resume
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={handleEmailChange}
              disabled={isSubmitting}
              className={`mt-1 ${emailError ? 'border-red-500' : ''}`}
              autoFocus
            />
            {emailError && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                {emailError}
              </p>
            )}
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-400">
            <p className="mb-2">What happens next:</p>
            <ul className="space-y-1">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Your resume will be optimized immediately (30-60 seconds)</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>You'll receive an email with the download link</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span>Get tips to improve your job search</span>
              </li>
            </ul>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting}
            size="lg"
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Optimizing Your Resume...
              </>
            ) : (
              <>
                Optimize My Resume
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center text-gray-500 dark:text-gray-500">
            By submitting, you agree to receive helpful tips about your job
            search. You can unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}
