/**
 * Resume Upload Zone Component
 * Drag-and-drop file upload for resume builder
 */

'use client';

import { useState, useCallback } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ResumeUploadZoneProps {
  onUploadComplete: (data: { uploadId: string; fileName: string }) => void;
  onError: (error: string) => void;
}

export function ResumeUploadZone({
  onUploadComplete,
  onError,
}: ResumeUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    []
  );

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (!allowedTypes.includes(file.type)) {
      onError('Please upload a PDF, DOCX, or TXT file');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      onError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('/api/public/resume-optimize', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok && result.status === 'success') {
        onUploadComplete({
          uploadId: result.data.uploadId,
          fileName: result.data.fileName,
        });
      } else {
        onError(result.error || 'Upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Upload error:', error);
      onError('Network error. Please check your connection and try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      {!selectedFile ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            relative border-2 border-dashed rounded-lg p-12 text-center
            transition-colors cursor-pointer
            ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
            }
          `}
        >
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={handleFileInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            id="file-upload"
          />

          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className="w-12 h-12 text-gray-400" />
            </div>

            <div>
              <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                Drop your resume here, or click to browse
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Supports PDF, DOCX, and TXT files (max 10MB)
              </p>
            </div>

            <Button asChild variant="outline" size="lg">
              <label htmlFor="file-upload" className="cursor-pointer">
                Choose File
              </label>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Selected file preview */}
          <div className="border border-gray-300 dark:border-gray-700 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>

              {!isUploading && (
                <button
                  onClick={handleClearFile}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Remove file"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              )}
            </div>
          </div>

          {/* Upload button */}
          <Button
            onClick={handleUpload}
            disabled={isUploading}
            size="lg"
            className="w-full"
          >
            {isUploading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload Resume
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
