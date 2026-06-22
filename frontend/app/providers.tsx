"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useState } from "react";

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const ClerkProviders = clerkKey
  ? dynamic(
      () =>
        import("@/components/ClerkProviders").then((m) => m.ClerkProviders),
      { ssr: false },
    )
  : null;

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  const tree = (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );

  if (!ClerkProviders || !clerkKey) {
    return tree;
  }

  return <ClerkProviders publishableKey={clerkKey}>{tree}</ClerkProviders>;
}