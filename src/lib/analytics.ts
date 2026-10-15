import posthog from "posthog-js";

function canCapture() {
  return typeof window !== "undefined" && !navigator.webdriver && posthog.__loaded;
}

export function track(event: string, properties?: Record<string, unknown>) {
  if (!canCapture()) return;
  posthog.capture(event, properties);
}

export function trackException(error: unknown, properties?: Record<string, unknown>) {
  if (!canCapture()) return;
  posthog.captureException(error, properties);
}
