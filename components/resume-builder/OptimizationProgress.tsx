/**
 * Optimization Progress Component
 * Shows progress during resume optimization
 */

'use client';

import { CheckCircle2, Loader2 } from 'lucide-react';

export function OptimizationProgress() {
  const steps = [
    'Analyzing your resume...',
    'Identifying ATS compatibility issues...',
    'Optimizing keywords and formatting...',
    'Generating your improved resume...',
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full mb-4">
            <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Optimizing Your Resume
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            This usually takes 30-60 seconds
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div
              key={index}
              className="flex items-center space-x-3 animate-pulse"
              style={{ animationDelay: `${index * 200}ms` }}
            >
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-ping" />
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300">{step}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100 text-center">
            💡 While you wait: Did you know that 75% of resumes are rejected by
            ATS before reaching a human recruiter?
          </p>
        </div>
      </div>
    </div>
  );
}
