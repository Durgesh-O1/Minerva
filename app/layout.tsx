import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Minerva — AI-Powered Diagnostic Learning",
  description: "Diagnosing root conceptual learning gaps and misconceptions with Socratic AI guidance.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col relative text-[#22223B]">
        {/* Fixed Topographic Background Layer with Cream Overlay & Subtle Blur */}
        <div 
          aria-hidden="true"
          className="fixed inset-0 z-[-10] pointer-events-none overflow-hidden bg-[#F2E9E4]"
        >
          {/* Topographic Contour Texture with subtle blur */}
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 blur-[1px] transform scale-102 transition-opacity duration-700"
            style={{ backgroundImage: `url('/topographic-bg.jpg')` }}
          />
          {/* Translucent cream/parchment overlay to soften contour lines and optimize readability */}
          <div className="absolute inset-0 bg-[#F2E9E4]/65 backdrop-blur-[1px]" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}
