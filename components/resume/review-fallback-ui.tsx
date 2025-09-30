/**
 * Review UI for fallback resume uploads
 * Shows raw paragraphs and allows conversion to bullets
 */

"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react"
import { convertToBullets } from "@/lib/upload-handler"

interface ReviewFallbackUIProps {
  resumeId: string
  rawParagraphs: string[]
  onComplete?: () => void
}

export function ReviewFallbackUI({ resumeId, rawParagraphs, onComplete }: ReviewFallbackUIProps) {
  const [selectedParagraph, setSelectedParagraph] = useState<string>("")
  const [convertedBullets, setConvertedBullets] = useState<string[]>([])
  const [isConverting, setIsConverting] = useState(false)
  const [error, setError] = useState("")

  const handleConvert = async (paragraph: string) => {
    setIsConverting(true)
    setError("")
    setSelectedParagraph(paragraph)

    const result = await convertToBullets(paragraph)

    if (result.error) {
      setError(result.error)
      setConvertedBullets([])
    } else {
      setConvertedBullets(result.bullets)
    }

    setIsConverting(false)
  }

  return (
    <div className="space-y-4">
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Your resume was uploaded successfully, but we couldn't automatically extract structured data.
          Please review the content below and convert paragraphs to bullet points if needed.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Raw Content</CardTitle>
            <CardDescription>
              Select a paragraph to convert to resume bullet points
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {rawParagraphs.map((paragraph, index) => (
              <div
                key={index}
                className="p-3 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                onClick={() => handleConvert(paragraph)}
              >
                <p className="text-sm line-clamp-3">{paragraph}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Converted Bullets</CardTitle>
            <CardDescription>
              AI-generated resume bullet points
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isConverting ? (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : convertedBullets.length > 0 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Original:</p>
                  <Textarea
                    value={selectedParagraph}
                    readOnly
                    className="min-h-[100px] resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium">Bullet Points:</p>
                  <ul className="list-disc list-inside space-y-1">
                    {convertedBullets.map((bullet, index) => (
                      <li key={index} className="text-sm">{bullet}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground text-center p-8">
                Select a paragraph from the left to convert
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {onComplete && (
        <div className="flex justify-end">
          <Button onClick={onComplete}>
            <CheckCircle className="mr-2 h-4 w-4" />
            Continue
          </Button>
        </div>
      )}
    </div>
  )
}