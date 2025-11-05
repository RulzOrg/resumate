/**
 * Results Display Component
 * Shows optimization results and download link
 */

'use client';

import { Download, CheckCircle2, Mail, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResultsDisplayProps {
  downloadUrl: string;
  improvements: Array<{ title: string; description: string }>;
  score: number;
}

export function ResultsDisplay({
  downloadUrl,
  improvements,
  score,
}: ResultsDisplayProps) {
  const handleDownload = () => {
    window.open(downloadUrl, '_blank');
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full mb-4">
          <CheckCircle2 className="w-12 h-12 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Your Resume is Ready!
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          We've optimized your resume for ATS compatibility
        </p>
      </div>

      {/* Score Card */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg p-6 border border-blue-200 dark:border-blue-800 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              ATS Compatibility Score
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              How well your resume works with applicant tracking systems
            </p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-bold text-blue-600 dark:text-blue-400">
              {score}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              out of 100
            </div>
          </div>
        </div>
      </div>

      {/* Download Section */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Download Your Optimized Resume
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Also sent to your email
            </p>
          </div>
          <Button onClick={handleDownload} size="lg">
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Improvements List */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
          What We Improved
        </h3>
        <div className="space-y-4">
          {improvements.map((improvement, index) => (
            <div key={index} className="flex items-start space-x-3">
              <div className="flex-shrink-0 mt-1">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">
                  {improvement.title}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {improvement.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Email Confirmation */}
      <div className="bg-green-50 dark:bg-green-950 rounded-lg p-6 border border-green-200 dark:border-green-800 mb-6">
        <div className="flex items-start space-x-3">
          <Mail className="w-6 h-6 text-green-600 dark:text-green-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-medium text-green-900 dark:text-green-100 mb-1">
              Check Your Email
            </h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              We've sent your optimized resume and detailed improvements to your
              email. The download link is valid for 7 days.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-8 text-center text-white">
        <h3 className="text-2xl font-bold mb-2">Want Even More Features?</h3>
        <p className="mb-6 opacity-90">
          Create a free account to tailor your resume to specific jobs, track
          applications, and get personalized recommendations.
        </p>
        <Button
          size="lg"
          variant="secondary"
          className="bg-white text-blue-600 hover:bg-gray-100"
          asChild
        >
          <a href="/signup">
            Create Free Account
            <ArrowRight className="w-5 h-5 ml-2" />
          </a>
        </Button>
      </div>
    </div>
  );
}
