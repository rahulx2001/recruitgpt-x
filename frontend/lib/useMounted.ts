"use client";

import * as React from "react";

/** True after the first client paint — avoids SSR/hydration leaving motion at opacity 0. */
export function useMounted() {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return mounted;
}