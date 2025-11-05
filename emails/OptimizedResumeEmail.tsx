/**
 * Email Template for Optimized Resume Delivery
 * Sent to users after their resume is optimized
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface OptimizedResumeEmailProps {
  downloadUrl: string;
  improvements: {
    title: string;
    description: string;
  }[];
  expiresInDays?: number;
}

export const OptimizedResumeEmail = ({
  downloadUrl,
  improvements = [],
  expiresInDays = 7,
}: OptimizedResumeEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your ATS-optimized resume is ready to download!</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your Optimized Resume is Ready! 🚀</Heading>

          <Text style={text}>
            Great news! I've analyzed your resume and made it more
            ATS-friendly. Your optimized version is ready to download.
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={downloadUrl}>
              Download Your Optimized Resume
            </Button>
          </Section>

          <Hr style={hr} />

          <Heading style={h2}>What We Improved:</Heading>

          {improvements.length > 0 ? (
            improvements.map((improvement, index) => (
              <Section key={index} style={improvementSection}>
                <Text style={improvementTitle}>
                  ✓ {improvement.title}
                </Text>
                <Text style={improvementDescription}>
                  {improvement.description}
                </Text>
              </Section>
            ))
          ) : (
            <Text style={text}>
              Your resume has been optimized for ATS systems with improved
              formatting and keyword optimization.
            </Text>
          )}

          <Hr style={hr} />

          <Heading style={h2}>Next Steps:</Heading>

          <Text style={text}>
            1. Download your optimized resume using the button above
            <br />
            2. Review the improvements and customize as needed
            <br />
            3. Start applying to jobs with confidence!
          </Text>

          <Section style={ctaSection}>
            <Text style={ctaText}>
              Want even more features? Create a free account to:
            </Text>
            <ul style={featureList}>
              <li>Tailor your resume to specific job postings</li>
              <li>Get personalized ATS scores and recommendations</li>
              <li>Track your job applications</li>
              <li>Generate cover letters automatically</li>
            </ul>
            <Button style={secondaryButton} href="https://resumate.com/signup">
              Create Free Account
            </Button>
          </Section>

          <Hr style={hr} />

          <Text style={footer}>
            This download link expires in {expiresInDays} days.
            <br />
            <br />
            Best of luck with your job search!
            <br />
            John
            <br />
            <br />
            <Link href="https://resumate.com" style={link}>
              Resumate
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default OptimizedResumeEmail;

// Styles
const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
  maxWidth: '600px',
};

const h1 = {
  color: '#333',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0 40px',
  lineHeight: '1.3',
};

const h2 = {
  color: '#333',
  fontSize: '22px',
  fontWeight: 'bold',
  margin: '30px 40px 20px',
  lineHeight: '1.3',
};

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  margin: '16px 40px',
};

const buttonContainer = {
  padding: '27px 0',
  textAlign: 'center' as const,
};

const button = {
  backgroundColor: '#5469d4',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 40px',
};

const secondaryButton = {
  backgroundColor: '#22c55e',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 30px',
  marginTop: '16px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
};

const improvementSection = {
  margin: '16px 40px',
};

const improvementTitle = {
  color: '#22c55e',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 8px',
  lineHeight: '1.4',
};

const improvementDescription = {
  color: '#666',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '0 0 16px',
};

const ctaSection = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '24px',
  margin: '24px 40px',
};

const ctaText = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  margin: '0 0 12px',
};

const featureList = {
  color: '#666',
  fontSize: '15px',
  lineHeight: '24px',
  margin: '12px 0',
  paddingLeft: '20px',
};

const footer = {
  color: '#8898aa',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '48px 40px 0',
};

const link = {
  color: '#5469d4',
  textDecoration: 'underline',
};
