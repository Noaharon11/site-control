import { Analytics } from "@vercel/analytics/next"
import type { Metadata, Viewport } from "next"
import { Heebo } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { StoreProvider } from "@/lib/store"
import { AppShell } from "@/components/shell/app-shell"
import "./globals.css"

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
})

export const metadata: Metadata = {
  title: "פרויקט הרקפות – ניהול אתר",
  description:
    "מערכת ניהול לפרויקט בנייה: סיור בוקר, משימות, חסמים, מצב הפרויקט ותכנון שבועי.",
  generator: "v0.app",
  icons: {
    icon: [
      { url: "/icon-light-32x32.png", media: "(prefers-color-scheme: light)" },
      { url: "/icon-dark-32x32.png", media: "(prefers-color-scheme: dark)" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
}

export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#2f3540",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} bg-background`}>
      <body className="antialiased font-sans">
        <StoreProvider>
          <AppShell>{children}</AppShell>
        </StoreProvider>
        <Toaster position="top-center" dir="rtl" />
        {process.env.NODE_ENV === "production" && <Analytics />}
      </body>
    </html>
  )
}
