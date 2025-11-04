/**
 * Resume Builder Lead Magnet Page
 * Public page for optimizing resumes without authentication
 */

'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Sparkles, Target, Zap } from 'lucide-react';
import { ResumeUploadZone } from '@/components/resume-builder/ResumeUploadZone';
import { EmailCaptureForm } from '@/components/resume-builder/EmailCaptureForm';
import { OptimizationProgress } from '@/components/resume-builder/OptimizationProgress';
import { ResultsDisplay } from '@/components/resume-builder/ResultsDisplay';

type Step = 'upload' | 'email' | 'processing' | 'results';

interface UploadData {
  uploadId: string;
  fileName: string;
}

interface ResultsData {
  downloadUrl: string;
  improvements: Array<{ title: string; description: string }>;
  score: number;
}

export default function ResumeBuilderPage() {
  const [currentStep, setCurrentStep] = useState<Step>('upload');
  const [uploadData, setUploadData] = useState<UploadData | null>(null);
  const [resultsData, setResultsData] = useState<ResultsData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUploadComplete = (data: UploadData) => {
    setUploadData(data);
    setCurrentStep('email');
    setError(null);
  };

  const handleEmailSubmit = (data: ResultsData) => {
    setCurrentStep('processing');
    setError(null);

    // Show processing for a moment, then show results
    setTimeout(() => {
      setResultsData(data);
      setCurrentStep('results');
    }, 2000);
  };

  const handleError = (errorMessage: string) => {
    setError(errorMessage);
    // Auto-clear error after 5 seconds
    setTimeout(() => setError(null), 5000);
  };

  const handleStartOver = () => {
    setCurrentStep('upload');
    setUploadData(null);
    setResultsData(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-blue-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Resumate
              </span>
            </div>
            <a
              href="/"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Back to Home
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section - Only show on upload step */}
        {currentStep === 'upload' && (
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Free ATS Resume Optimization
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-3xl mx-auto">
              Get your resume optimized for Applicant Tracking Systems in
              seconds. Improve your chances of landing interviews.
            </p>

            {/* Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-12">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg mb-4">
                  <Zap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Instant Results
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Get your optimized resume in under 60 seconds
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg mb-4">
                  <Target className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  ATS Optimized
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Formatted to pass through ATS filters
                </p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg mb-4">
                  <CheckCircle2 className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Sign-Up Required
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Just upload and get your optimized resume
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-900 dark:text-red-100 mb-1">
                  Error
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  {error}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-12">
          {currentStep === 'upload' && (
            <ResumeUploadZone
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          )}

          {currentStep === 'email' && uploadData && (
            <EmailCaptureForm
              uploadId={uploadData.uploadId}
              fileName={uploadData.fileName}
              onSubmitSuccess={handleEmailSubmit}
              onError={handleError}
            />
          )}

          {currentStep === 'processing' && <OptimizationProgress />}

          {currentStep === 'results' && resultsData && (
            <>
              <ResultsDisplay
                downloadUrl={resultsData.downloadUrl}
                improvements={resultsData.improvements}
                score={resultsData.score}
              />

              {/* Start Over Button */}
              <div className="text-center mt-8">
                <button
                  onClick={handleStartOver}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
                >
                  Optimize Another Resume →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Trust Indicators - Only show on upload step */}
        {currentStep === 'upload' && (
          <div className="text-center">
            <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
              Trusted by job seekers worldwide
            </p>
            <div className="flex items-center justify-center space-x-8 text-gray-400 dark:text-gray-600">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  10k+
                </div>
                <div className="text-xs">Resumes Optimized</div>
              </div>
              <div className="h-12 w-px bg-gray-300 dark:bg-gray-700"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  95%
                </div>
                <div className="text-xs">Success Rate</div>
              </div>
              <div className="h-12 w-px bg-gray-300 dark:bg-gray-700"></div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  &lt;60s
                </div>
                <div className="text-xs">Average Time</div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-500">
            © 2024 Resumate. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
