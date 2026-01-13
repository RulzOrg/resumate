import { ImageResponse } from "next/og"

export const size = {
  width: 32,
  height: 32,
}
export const contentType = "image/png"

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
        }}
      >
        <svg
          width="32"
          height="26"
          viewBox="0 0 32 26"
          fill="none"
        >
          <path
            d="M25.502 3.86426C27.1588 3.86426 28.502 5.2074 28.502 6.86426V7.95703H3.1543V6.86426C3.1543 5.2074 4.49744 3.86426 6.1543 3.86426H25.502Z"
            fill="#00BC7D"
          />
          <path
            d="M28.6562 8.95703C30.3129 8.95728 31.6562 10.3003 31.6562 11.957V22.5293C31.6562 23.8219 30.8367 24.92 29.6904 25.3418H1.96484C0.818778 24.9199 8.36019e-05 23.8218 0 22.5293V11.957C0 10.3002 1.34315 8.95703 3 8.95703H28.6562Z"
            fill="#00BC7D"
          />
          <path
            d="M22.4438 0C24.0552 0 25.369 1.27037 25.4399 2.86426H6.21631C6.28724 1.27037 7.60101 4.9463e-08 9.2124 0H22.4438Z"
            fill="#00BC7D"
          />
        </svg>
      </div>
    ),
    {
      ...size,
    }
  )
}
