import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { getOrCreateUser } from '@/lib/db'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth()

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await getOrCreateUser(userId)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Get match score trends (last 30 days)
    const matchTrends = await sql`
      SELECT 
        DATE(j.created_at) as date,
        AVG(j.match_score) as avg_score,
        COUNT(*) as job_count
      FROM job_analysis j
      WHERE j.user_id = ${user.id}
        AND j.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(j.created_at)
      ORDER BY DATE(j.created_at) DESC
      LIMIT 30
    `

    // Get keyword frequency (top 20)
    const keywordFrequency = await sql`
      SELECT 
        keyword,
        COUNT(*) as frequency
      FROM job_analysis j,
      UNNEST(j.keywords) AS keyword
      WHERE j.user_id = ${user.id}
      GROUP BY keyword
      ORDER BY frequency DESC
      LIMIT 20
    `

    // Get best performing resumes (by avg match score)
    const bestResumes = await sql`
      SELECT 
        r.id,
        r.title,
        r.file_name,
        COUNT(DISTINCT or2.id) as optimization_count,
        AVG(ja.match_score) as avg_match_score
      FROM resumes r
      LEFT JOIN optimized_resumes or2 ON or2.base_resume_id = r.id
      LEFT JOIN job_analysis ja ON ja.id = or2.job_id
      WHERE r.user_id = ${user.id}
        AND r.deleted_at IS NULL
      GROUP BY r.id, r.title, r.file_name
      HAVING COUNT(DISTINCT or2.id) > 0
      ORDER BY AVG(ja.match_score) DESC
      LIMIT 5
    `

    // Get overall statistics
    const stats = await sql`
      SELECT 
        COUNT(DISTINCT r.id) as total_resumes,
        COUNT(DISTINCT j.id) as total_jobs,
        COUNT(DISTINCT or2.id) as total_optimizations,
        AVG(j.match_score) as avg_match_score
      FROM resumes r
      FULL OUTER JOIN job_analysis j ON j.user_id = ${user.id}
      FULL OUTER JOIN optimized_resumes or2 ON or2.user_id = ${user.id}
      WHERE r.user_id = ${user.id}
        AND r.deleted_at IS NULL
    `

    // Get recent activity (last 10 actions)
    const recentActivity = await sql`
      (
        SELECT 
          'job_added' as type,
          job_title as title,
          company_name as subtitle,
          match_score as score,
          created_at
        FROM job_analysis
        WHERE user_id = ${user.id}
      )
      UNION ALL
      (
        SELECT 
          'resume_optimized' as type,
          r.title as title,
          ja.job_title as subtitle,
          ja.match_score as score,
          or2.created_at
        FROM optimized_resumes or2
        JOIN resumes r ON r.id = or2.optimized_resume_id
        JOIN job_analysis ja ON ja.id = or2.job_id
        WHERE or2.user_id = ${user.id}
      )
      ORDER BY created_at DESC
      LIMIT 10
    `

    // Get match score distribution
    const scoreDistribution = await sql`
      SELECT 
        CASE 
          WHEN match_score < 20 THEN '0-20'
          WHEN match_score < 40 THEN '20-40'
          WHEN match_score < 60 THEN '40-60'
          WHEN match_score < 80 THEN '60-80'
          ELSE '80-100'
        END as score_range,
        COUNT(*) as count
      FROM job_analysis
      WHERE user_id = ${user.id}
      GROUP BY score_range
      ORDER BY score_range
    `

    return NextResponse.json({
      matchTrends: matchTrends.map(row => ({
        date: row.date,
        avgScore: parseFloat(row.avg_score || '0'),
        jobCount: parseInt(row.job_count || '0')
      })),
      keywordFrequency: keywordFrequency.map(row => ({
        keyword: row.keyword,
        frequency: parseInt(row.frequency || '0')
      })),
      bestResumes: bestResumes.map(row => ({
        id: row.id,
        title: row.title,
        fileName: row.file_name,
        optimizationCount: parseInt(row.optimization_count || '0'),
        avgMatchScore: parseFloat(row.avg_match_score || '0')
      })),
      stats: stats[0] ? {
        totalResumes: parseInt(stats[0].total_resumes || '0'),
        totalJobs: parseInt(stats[0].total_jobs || '0'),
        totalOptimizations: parseInt(stats[0].total_optimizations || '0'),
        avgMatchScore: parseFloat(stats[0].avg_match_score || '0')
      } : null,
      recentActivity: recentActivity.map(row => ({
        type: row.type,
        title: row.title,
        subtitle: row.subtitle,
        score: parseFloat(row.score || '0'),
        createdAt: row.created_at
      })),
      scoreDistribution: scoreDistribution.map(row => ({
        range: row.score_range,
        count: parseInt(row.count || '0')
      }))
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
