/**
 * HTML Template for Resume Rendering
 * Used for PDF generation and print preview
 */

import type { ResumeJSON } from "@/lib/schemas-v2"

export function generateResumeHTML(resumeData: ResumeJSON): string {
  const skillsHTML = Object.entries(resumeData.skills)
    .filter(([_, skills]) => skills.length > 0)
    .map(([category, skills]) => {
      const label = category
        .replace(/([A-Z])/g, " $1")
        .trim()
        .replace(/^./, (c) => c.toUpperCase())
      return `<p class="skill-line"><strong>${label}:</strong> ${skills.join(", ")}</strong></p>`
    })
    .join("\n")

  const experienceHTML = resumeData.experience
    .map(
      (exp) => `
    <div class="experience-item">
      <div class="experience-header">
        <strong>${exp.company} — ${exp.location}</strong>
      </div>
      <div class="experience-subheader">
        <em>${exp.title}</em> | ${exp.start_date} – ${exp.end_date}
      </div>
      <ul>
        ${exp.bullets.map((bullet) => `<li>${bullet}</li>`).join("\n        ")}
      </ul>
    </div>
  `
    )
    .join("\n")

  const educationHTML = resumeData.education
    .map(
      (edu) => `
    <div class="education-item">
      <div><strong>${edu.degree} — ${edu.institution}</strong></div>
      ${edu.notes ? `<div class="education-notes">${edu.notes}</div>` : ""}
    </div>
  `
    )
    .join("\n")

  const certificationsHTML = resumeData.certifications
    .map((cert) => `<div class="cert-item">${cert.name} — ${cert.issuer}</div>`)
    .join("\n")

  const extrasHTML = resumeData.extras
    .map((extra) => `<div class="extra-item"><strong>${extra.label}:</strong> ${extra.value}</div>`)
    .join("\n")

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${resumeData.name} - Resume</title>
  <style>
    /* ATS-Friendly Print Styles */
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11pt;
      line-height: 1.5;
      color: #000;
      background: #fff;
      max-width: 8.5in;
      margin: 0.5in auto;
      padding: 0.5in;
    }

    /* Header */
    .header {
      text-align: center;
      margin-bottom: 24pt;
    }

    .header h1 {
      font-size: 18pt;
      font-weight: bold;
      margin-bottom: 6pt;
      color: #000;
    }

    .header .contact {
      font-size: 10pt;
      color: #333;
    }

    .headline {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 18pt;
      letter-spacing: 0.5pt;
    }

    /* Section Headers */
    h2 {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 3pt;
      margin-top: 18pt;
      margin-bottom: 12pt;
      letter-spacing: 0.5pt;
    }

    /* Professional Summary */
    .summary {
      text-align: justify;
      margin-bottom: 18pt;
    }

    /* Skills */
    .skills {
      margin-bottom: 18pt;
    }

    .skill-line {
      margin-bottom: 6pt;
    }

    /* Work Experience */
    .experience-item {
      margin-bottom: 18pt;
      page-break-inside: avoid;
    }

    .experience-header {
      font-weight: bold;
      margin-bottom: 3pt;
    }

    .experience-subheader {
      margin-bottom: 6pt;
      font-size: 10pt;
    }

    .experience-item ul {
      margin-left: 20pt;
      margin-top: 6pt;
    }

    .experience-item li {
      margin-bottom: 3pt;
      list-style-type: disc;
    }

    /* Education */
    .education-item {
      margin-bottom: 12pt;
    }

    .education-notes {
      margin-top: 3pt;
      font-size: 10pt;
    }

    /* Certifications */
    .cert-item {
      margin-bottom: 6pt;
    }

    /* Extras */
    .extra-item {
      margin-bottom: 6pt;
    }

    /* Print Optimization */
    @media print {
      body {
        margin: 0;
        padding: 0.5in 0.75in;
        max-width: none;
      }

      h2 {
        page-break-after: avoid;
      }

      .experience-item,
      .education-item {
        page-break-inside: avoid;
      }
    }

    /* PDF Generation Optimization */
    @page {
      size: Letter;
      margin: 0.5in 0.75in;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>${resumeData.name}</h1>
    <div class="contact">
      ${[
        resumeData.contact.location,
        resumeData.contact.email,
        resumeData.contact.phone,
        resumeData.contact.linkedin,
      ]
        .filter(Boolean)
        .join(" | ")}
    </div>
  </div>

  ${resumeData.headline ? `<div class="headline">${resumeData.headline}</div>` : ""}

  <!-- Professional Summary -->
  ${
    resumeData.summary
      ? `
  <h2>Professional Summary</h2>
  <div class="summary">${resumeData.summary}</div>
  `
      : ""
  }

  <!-- Skills -->
  ${
    skillsHTML
      ? `
  <h2>Skills</h2>
  <div class="skills">
    ${skillsHTML}
  </div>
  `
      : ""
  }

  <!-- Work Experience -->
  ${
    experienceHTML
      ? `
  <h2>Work Experience</h2>
  ${experienceHTML}
  `
      : ""
  }

  <!-- Education -->
  ${
    educationHTML
      ? `
  <h2>Education</h2>
  ${educationHTML}
  `
      : ""
  }

  <!-- Certifications -->
  ${
    certificationsHTML
      ? `
  <h2>Certifications</h2>
  ${certificationsHTML}
  `
      : ""
  }

  <!-- Extras -->
  ${
    extrasHTML
      ? `
  <h2>Additional</h2>
  ${extrasHTML}
  `
      : ""
  }
</body>
</html>
  `.trim()
}
