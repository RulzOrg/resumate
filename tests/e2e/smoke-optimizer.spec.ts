import { test, expect } from '@playwright/test'

test.describe('Optimizer 3-step flow (smoke)', () => {
  test('Step1 -> Step2 -> Step3 -> Generate with stubbed APIs', async ({ page }) => {
    // Stub Analyze API
    await page.route('**/api/jobs/analyze', async route => {
      const json = {
        analysis: {
          id: 'analysis-e2e-1',
          job_title: 'Senior Product Manager',
          company_name: 'Acme Co',
          analysis_result: {
            keywords: ['roadmap','analytics','frontend'],
            required_skills: ['Roadmap','A/B Testing'],
            preferred_skills: ['APIs'],
            key_requirements: ['Lead roadmap', 'Ship features'],
            culture: ['Ownership'],
            benefits: ['Health'],
            location: 'Remote',
            experience_level: 'Senior',
          }
        }
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) })
    })

    // Stub Optimize API
    await page.route('**/api/resumes/optimize', async route => {
      const json = {
        optimized_resume: {
          id: 'opt-e2e-1',
          optimized_content: '# Optimized Resume\n\n**Summary**: Tailored content for Senior PM at Acme Co.',
        }
      }
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(json) })
    })

    // Go to test harness
    await page.goto('/e2e/optimizer')

    // Step 1 visible
    await expect(page.getByText('AI Resume Optimization')).toBeVisible()
    await expect(page.getByText('Setup')).toBeVisible()

    // Analyze with AI (stubbed)
    await page.getByRole('button', { name: 'Analyze with AI' }).click()
    await expect(page.getByText('Job analyzed')).toBeVisible()

    // Continue to Step 2
    await page.getByRole('button', { name: 'Continue' }).click()
    await expect(page.getByText('Review Job')).toBeVisible()

    // Continue to Optimize (Step 3)
    await page.getByRole('button', { name: 'Continue to Optimize' }).click()
    await expect(page.getByText('Optimize')).toBeVisible()

    // Generate Optimized Resume (stubbed)
    await page.getByRole('button', { name: 'Generate Optimized Resume' }).click()
    await expect(page.getByText('Optimized resume generated')).toBeVisible()

    // Final screen
    await expect(page.getByText('Optimized Resume')).toBeVisible()
    await expect(page.getByText('Tailored content for Senior PM at Acme Co.')).toBeVisible()
  })
})
