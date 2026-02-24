import type { Preview, Renderer } from "@storybook/nextjs";
import { withThemeByClassName } from "@storybook/addon-themes";
import React from "react";

import "./fonts.css";
import "../app/globals.css";

import { TooltipProvider } from "../components/ui/tooltip";

// Font CSS variable fallbacks — in the real app, next/font sets these on <body>.
// Here we set them so the @theme inline block in globals.css resolves correctly.
const FONT_CSS_VARIABLES = {
  "--font-geist-sans":
    '"Geist Sans", "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif',
  "--font-geist-mono": '"Geist Mono", "Fira Code", ui-monospace, monospace',
  "--font-space-grotesk": '"Space Grotesk", "Inter", sans-serif',
  "--font-lora": '"Lora", Georgia, "Times New Roman", serif',
} as const;

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    docs: {
      toc: true,
    },
  },

  decorators: [
    withThemeByClassName<Renderer>({
      themes: {
        light: "",
        dark: "dark",
      },
      defaultTheme: "dark",
    }),

    (Story) => (
      <div style={FONT_CSS_VARIABLES as React.CSSProperties}>
        <TooltipProvider>
          <Story />
        </TooltipProvider>
      </div>
    ),
  ],
};

export default preview;
