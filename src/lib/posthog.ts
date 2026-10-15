import type { PostHogConfig } from "posthog-js";

export const posthogToken = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
export const posthogHost = import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com";

export const posthogOptions = {
  api_host: posthogHost,
  defaults: "2026-01-30",
  capture_pageview: true,
  capture_exceptions: true,
  person_profiles: "identified_only",
  before_send(event) {
    if (!event) return event;
    event.properties = { ...event.properties, product: "drift" };
    return event;
  },
  loaded(client) {
    client.register({ product: "drift" });
    if (navigator.webdriver) client.opt_out_capturing();
  },
} satisfies Partial<PostHogConfig>;

export function shouldInitPostHog() {
  return Boolean(posthogToken) && typeof window !== "undefined" && !navigator.webdriver;
}
