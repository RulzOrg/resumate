-- Clean up duplicate job analyses, keeping only the most recent one for each unique combination
WITH duplicates AS (
  SELECT
    id,
    user_id,
    job_title,
    company_name,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, job_title, company_name
      ORDER BY created_at DESC
    ) AS row_num
  FROM job_analysis
)
DELETE FROM job_analysis
WHERE id IN (
  SELECT id
  FROM duplicates
  WHERE row_num > 1
);