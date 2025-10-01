-- Migration 003: CV Generation Tables
-- Creates tables for version management, variants, and changelog
-- Based on GENERATE_CV-PRD.md and GENERATE_CV_AUDIT_REPORT.md

-- Description: This migration adds support for generating multiple CV variants
-- (Conservative, Balanced, Bold) with version history and change tracking.

BEGIN;

-- Create cv_versions table for version management
CREATE TABLE IF NOT EXISTS cv_versions (
  version_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  job_id UUID NOT NULL,
  original_resume_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'current' CHECK(status IN ('current', 'archived')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign keys
  CONSTRAINT fk_cv_versions_user FOREIGN KEY (user_id) 
    REFERENCES users_sync(id) ON DELETE CASCADE,
  CONSTRAINT fk_cv_versions_job FOREIGN KEY (job_id) 
    REFERENCES job_analysis(id) ON DELETE CASCADE,
  CONSTRAINT fk_cv_versions_resume FOREIGN KEY (original_resume_id) 
    REFERENCES resumes(id) ON DELETE CASCADE
);

-- Create indexes for cv_versions
CREATE INDEX IF NOT EXISTS idx_cv_versions_user_job ON cv_versions(user_id, job_id);
CREATE INDEX IF NOT EXISTS idx_cv_versions_user ON cv_versions(user_id);
CREATE INDEX IF NOT EXISTS idx_cv_versions_job ON cv_versions(job_id);
CREATE INDEX IF NOT EXISTS idx_cv_versions_status ON cv_versions(status);
CREATE INDEX IF NOT EXISTS idx_cv_versions_created_at ON cv_versions(created_at DESC);

-- Create cv_variants table for storing different variant styles
CREATE TABLE IF NOT EXISTS cv_variants (
  variant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL,
  label TEXT NOT NULL CHECK(label IN ('Conservative', 'Balanced', 'Bold')),
  draft JSONB NOT NULL,
  is_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_cv_variants_version FOREIGN KEY (version_id) 
    REFERENCES cv_versions(version_id) ON DELETE CASCADE,
  
  -- Unique constraint: one variant of each label per version
  CONSTRAINT unique_variant_label_per_version UNIQUE (version_id, label)
);

-- Create indexes for cv_variants
CREATE INDEX IF NOT EXISTS idx_cv_variants_version ON cv_variants(version_id);
CREATE INDEX IF NOT EXISTS idx_cv_variants_label ON cv_variants(label);
CREATE INDEX IF NOT EXISTS idx_cv_variants_selected ON cv_variants(is_selected) WHERE is_selected = true;

-- Create cv_changelog table for tracking changes
CREATE TABLE IF NOT EXISTS cv_changelog (
  changelog_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL,
  change_type TEXT NOT NULL CHECK(change_type IN (
    'skill_added', 
    'skill_removed', 
    'section_moved', 
    'bullet_locked', 
    'experience_reordered',
    'section_trimmed',
    'keyword_added'
  )),
  details JSONB NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Foreign key
  CONSTRAINT fk_cv_changelog_version FOREIGN KEY (version_id) 
    REFERENCES cv_versions(version_id) ON DELETE CASCADE
);

-- Create indexes for cv_changelog
CREATE INDEX IF NOT EXISTS idx_cv_changelog_version ON cv_changelog(version_id);
CREATE INDEX IF NOT EXISTS idx_cv_changelog_type ON cv_changelog(change_type);
CREATE INDEX IF NOT EXISTS idx_cv_changelog_created_at ON cv_changelog(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE cv_versions IS 'Version history for CV generations. One version per job, can have multiple variants.';
COMMENT ON TABLE cv_variants IS 'Stores 3 variants per version: Conservative (minimal changes), Balanced (moderate), Bold (aggressive optimization)';
COMMENT ON TABLE cv_changelog IS 'Tracks all changes made during CV generation for transparency and audit trail';

COMMENT ON COLUMN cv_versions.status IS 'Current = active version, Archived = superseded by newer version';
COMMENT ON COLUMN cv_variants.draft IS 'Complete CvDraft object as JSON matching CvDraftSchema from lib/schemas.generate.ts';
COMMENT ON COLUMN cv_variants.is_selected IS 'User-selected variant for this version (only one can be selected)';
COMMENT ON COLUMN cv_variants.label IS 'Variant style: Conservative (close to original), Balanced (moderate), Bold (maximum impact)';
COMMENT ON COLUMN cv_changelog.change_type IS 'Type of change made during generation';
COMMENT ON COLUMN cv_changelog.details IS 'JSON object with change details (e.g., {skill: "Python", justification: "Found in experience section"})';

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cv_version_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS trigger_update_cv_version_updated_at ON cv_versions;
CREATE TRIGGER trigger_update_cv_version_updated_at
  BEFORE UPDATE ON cv_versions
  FOR EACH ROW
  EXECUTE FUNCTION update_cv_version_updated_at();

COMMIT;

-- Verification queries (commented out, can be run manually)
-- SELECT COUNT(*) FROM cv_versions;
-- SELECT COUNT(*) FROM cv_variants;
-- SELECT COUNT(*) FROM cv_changelog;
-- SELECT version_id, user_id, job_id, status, created_at FROM cv_versions LIMIT 5;
