import type { Metadata } from "next"
import { Providers } from "@/components/providers/providers"
import "./globals.css"

export const metadata: Metadata = {
  title: "Campus RAG Preview",
  description:
    "Frontend-first mock experience for a campus RAG chatbot with onboarding, project spaces, AI chat, and developer support chat.",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full antialiased">
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
