"use client"

import { Component, ReactNode } from "react"
import { AlertTriangle, RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error("ErrorBoundary caught an error:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-xl border border-white/10 bg-white/5 p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/10 mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            
            <h2 className="text-xl font-semibold text-white mb-2 font-space-grotesk">
              Something went wrong
            </h2>
            
            <p className="text-sm text-white/60 mb-6 font-geist">
              {this.state.error?.message || "An unexpected error occurred. Please try refreshing the page."}
            </p>
            
            <div className="flex gap-3 justify-center">
              <Button
                onClick={() => window.location.reload()}
                className="bg-emerald-500 text-black hover:bg-emerald-400"
              >
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              
              <Button
                variant="outline"
                onClick={() => this.setState({ hasError: false, error: undefined })}
                className="bg-white/10 border-white/10"
              >
                Try Again
              </Button>
            </div>
            
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-white/40 cursor-pointer hover:text-white/60 font-mono">
                  Error Details (dev only)
                </summary>
                <pre className="mt-2 p-3 rounded bg-black/50 text-xs text-red-300 overflow-auto font-mono">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
