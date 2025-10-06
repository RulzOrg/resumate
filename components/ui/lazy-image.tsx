"use client"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { supportsIntersectionObserver } from "@/lib/performance"

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  placeholderSrc?: string
  threshold?: number
  rootMargin?: string
}

/**
 * Lazy loading image component with intersection observer
 * Only loads images when they enter the viewport
 */
export function LazyImage({
  src,
  alt,
  placeholderSrc,
  threshold = 0.01,
  rootMargin = "50px",
  className,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | undefined>(placeholderSrc)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isError, setIsError] = useState(false)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // If intersection observer is not supported, load immediately
    if (!supportsIntersectionObserver()) {
      setImageSrc(src)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src)
            observer.disconnect()
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    if (imgRef.current) {
      observer.observe(imgRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [src, threshold, rootMargin])

  const handleLoad = () => {
    setIsLoaded(true)
  }

  const handleError = () => {
    setIsError(true)
    setIsLoaded(true)
  }

  return (
    <img
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      className={cn(
        "transition-opacity duration-300",
        isLoaded ? "opacity-100" : "opacity-0",
        isError && "bg-white/5",
        className
      )}
      {...props}
    />
  )
}

/**
 * Lazy loading background image component
 */
export function LazyBackgroundImage({
  src,
  placeholderSrc,
  threshold = 0.01,
  rootMargin = "50px",
  className,
  children,
  ...props
}: {
  src: string
  placeholderSrc?: string
  threshold?: number
  rootMargin?: string
  className?: string
  children?: React.ReactNode
} & React.HTMLAttributes<HTMLDivElement>) {
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>(
    placeholderSrc ? `url(${placeholderSrc})` : undefined
  )
  const [isLoaded, setIsLoaded] = useState(false)
  const divRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!supportsIntersectionObserver()) {
      setBackgroundImage(`url(${src})`)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Preload the image
            const img = new Image()
            img.onload = () => {
              setBackgroundImage(`url(${src})`)
              setIsLoaded(true)
            }
            img.src = src
            observer.disconnect()
          }
        })
      },
      {
        threshold,
        rootMargin
      }
    )

    if (divRef.current) {
      observer.observe(divRef.current)
    }

    return () => {
      observer.disconnect()
    }
  }, [src, threshold, rootMargin])

  return (
    <div
      ref={divRef}
      className={cn(
        "bg-cover bg-center transition-opacity duration-300",
        isLoaded ? "opacity-100" : "opacity-75",
        className
      )}
      style={{ backgroundImage }}
      {...props}
    >
      {children}
    </div>
  )
}
