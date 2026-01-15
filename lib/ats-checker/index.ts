/**
 * ATS Resume Checker
 * Lead magnet feature for analyzing resume ATS compatibility
 */

// Main analyzer
export { runATSAnalysis, getQuickPreview, type AnalyzerInput, type AnalyzerOutput } from './analyzer'

// Database operations
export {
  createATSCheck,
  getATSCheckById,
  getATSCheckByIdAndEmail,
  updateATSCheckStatus,
  captureEmail,
  saveExtractedContent,
  saveAnalysisResults,
  markBeehiivSubscribed,
  trackConversion,
  getRecentChecksByIP,
  getRecentAnalysesByEmail,
  getATSCheckHistory,
  cleanupExpiredChecks,
  getConversionMetrics,
} from './db'

// Scoring utilities
export {
  calculateOverallScore,
  calculateContentScore,
  calculateSectionsScore,
  calculateEssentialsScore,
  calculateTailoringScore,
  collectAllIssues,
  countIssuesBySeverity,
  generateSummary,
  getScoreGrade,
  getStatus,
} from './scoring'

// Types
export type {
  ATSCheckResult,
  ATSCheckRecord,
  ATSCheckStatus,
  ATSIssue,
  IssueSeverity,
  IssueCategory,
  Subcategory,
  SubcategoryResult,
  CategoryScore,
  ContentAnalysis,
  SectionsAnalysis,
  EssentialsAnalysis,
  TailoringAnalysis,
  UploadRequest,
  UploadResponse,
  AnalyzeRequest,
  AnalyzeResponse,
  ResultsResponse,
  ErrorResponse,
} from './types'

// Scoring weights
export {
  SCORING_WEIGHTS,
  CONTENT_WEIGHTS,
  SECTIONS_WEIGHTS,
  ESSENTIALS_WEIGHTS,
  TAILORING_WEIGHTS,
} from './types'
