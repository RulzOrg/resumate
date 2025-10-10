/**
 * PDF Generator Service
 * Converts HTML resume to PDF using Puppeteer
 * For Vercel deployment, uses @sparticuz/chromium
 */

import type { ResumeJSON } from "@/lib/schemas-v2"
import { generateResumeHTML } from "./html-template"

/**
 * Generates a PDF file from structured resume JSON
 * 
 * Note: This implementation provides the foundation for PDF generation.
 * For production deployment on Vercel, install:
 * - puppeteer-core (lightweight Puppeteer)
 * - @sparticuz/chromium (Chromium for serverless)
 * 
 * Local development alternative: Use playwright or chrome-headless-shell
 */
export async function generatePDF(resumeData: ResumeJSON): Promise<Buffer> {
  // Generate HTML
  const html = generateResumeHTML(resumeData)

  // For production, use this approach:
  // 1. Install dependencies: npm install puppeteer-core @sparticuz/chromium
  // 2. Uncomment the implementation below

  try {
    // Dynamic import to avoid loading Puppeteer when not needed
    const puppeteer = await import("puppeteer")
    
    const browser = await puppeteer.default.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    })

    const page = await browser.newPage()
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 816, height: 1056 }) // 8.5" x 11" at 96 DPI

    // Load HTML content
    await page.setContent(html, {
      waitUntil: "networkidle0",
    })

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.75in",
        bottom: "0.5in",
        left: "0.75in",
      },
    })

    await browser.close()

    return Buffer.from(pdfBuffer)
  } catch (error) {
    console.error("PDF generation error:", error)
    
    // Fallback: Return HTML as a warning (client can print to PDF)
    throw new Error(
      "PDF generation requires Puppeteer. Please install: npm install puppeteer --save"
    )
  }
}

/**
 * For Vercel serverless deployment, use this alternative:
 */
export async function generatePDFServerless(resumeData: ResumeJSON): Promise<Buffer> {
  const html = generateResumeHTML(resumeData)

  try {
    // This would work on Vercel with proper setup:
    // import puppeteer from "puppeteer-core"
    // import chromium from "@sparticuz/chromium"
    
    // const browser = await puppeteer.launch({
    //   args: chromium.args,
    //   defaultViewport: chromium.defaultViewport,
    //   executablePath: await chromium.executablePath(),
    //   headless: chromium.headless,
    // })

    // For now, throw with instructions
    throw new Error(
      "Serverless PDF generation requires @sparticuz/chromium. Install: npm install puppeteer-core @sparticuz/chromium"
    )
  } catch (error) {
    console.error("Serverless PDF generation error:", error)
    throw error
  }
}

/**
 * Alternative: Use external PDF API (like pdf.co, DocRaptor, etc.)
 * This is simpler for serverless but requires paid API
 */
export async function generatePDFViaAPI(
  resumeData: ResumeJSON,
  apiKey: string
): Promise<Buffer> {
  const html = generateResumeHTML(resumeData)

  // Example using pdf.co or similar service
  // const response = await fetch('https://api.pdf.co/v1/pdf/convert/from/html', {
  //   method: 'POST',
  //   headers: {
  //     'x-api-key': apiKey,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     html,
  //     name: 'resume.pdf',
  //     marginTop: '0.5in',
  //     marginBottom: '0.5in',
  //     marginLeft: '0.75in',
  //     marginRight: '0.75in'
  //   })
  // })

  throw new Error("PDF API integration not configured. Set PDF_API_KEY environment variable.")
}
