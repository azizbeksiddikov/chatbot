"use client"

import type { PropsWithChildren } from "react"
import { AppStoreProvider } from "@/components/providers/app-store-provider"

export function Providers({ children }: PropsWithChildren) {
  return <AppStoreProvider>{children}</AppStoreProvider>
}
