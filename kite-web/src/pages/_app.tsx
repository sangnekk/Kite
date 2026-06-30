import "@/styles/globals.css";
import "@/styles/shadow.css";
import "@/styles/home.css";
import type { AppProps } from "next/app";
import {
  Inter as FontSans,
  Space_Grotesk as FontDisplay,
  JetBrains_Mono as FontMono,
} from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import queryClient from "@/lib/api/client";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/react";
import * as swetrix from "swetrix";

const fontSans = FontSans({
  subsets: ["latin"],
  variable: "--font-sans",
});

// Display face for the marketing home — geometric with a touch of personality,
// deliberately not Inter so headlines read as a choice, not a default.
const fontDisplay = FontDisplay({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

// Mono face for eyebrows, node labels and data — encodes the "code editor"
// world that the no-code builder replaces.
const fontMono = FontMono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

if (process.env.NODE_ENV === "production" && typeof window !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    swetrix.init("1Lhc9ncbpz6e", {
      apiURL: "https://swetrix.vaven.io/log",
    });
    swetrix.trackViews();
    swetrix.trackErrors({
      sampleRate: 1,
    });
  });
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${fontSans.style.fontFamily};
        }
      `}</style>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class">
          <TooltipProvider delayDuration={200}>
            <div className={`${fontDisplay.variable} ${fontMono.variable}`}>
              <Component {...pageProps} />
            </div>
            <Toaster position="top-right" richColors={true} />

            <SpeedInsights />
            <Analytics />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}
