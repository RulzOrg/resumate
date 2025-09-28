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
    await expect(page.getByRole('heading', { name: 'AI Resume Optimization' })).toBeVisible()
    await expect(page.getByText('Setup')).toBeVisible()

    // Analyze with AI (stubbed)
   await Promise.all([
     page.waitForResponse('**/api/jobs/analyze'),
     page.getByRole('button', { name: 'Analyze with AI' }).click(),
   ])

    // Continue to Step 2
   const continueButton = page.getByRole('button', { name: 'Continue' })
   await expect(continueButton).toBeEnabled()
   await continueButton.click()

    await expect(page.getByRole('heading', { name: 'Review Job' })).toBeVisible()
    await Promise.all([
      page.waitForResponse('**/api/resumes/optimize'),
      page.getByRole('button', { name: 'Generate Optimized Resume' }).click(),
    ])

    // Final screen
    await expect(page.getByRole('heading', { level: 2, name: 'Optimized Resume' })).toBeVisible()
    await expect(page.getByText('Tailored content for Senior PM at Acme Co.')).toBeVisible()
    // Generate Optimized Resume (stubbed)
    await page.getByRole('button', { name: 'Generate Optimized Resume' }).click()

    // Final screen
    await expect(page.getByRole('heading', { level: 2, name: 'Optimized Resume' })).toBeVisible()
    await expect(page.getByText('Tailored content for Senior PM at Acme Co.')).toBeVisible()
  })
})
