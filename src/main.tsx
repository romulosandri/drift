import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PostHogErrorBoundary, PostHogProvider } from "@posthog/react";

import App from "@/App.tsx";
import "@/index.css";
import { posthogOptions, posthogToken, shouldInitPostHog } from "@/lib/posthog.ts";

const root = document.getElementById("root");
if (!root) throw new Error("Missing root element.");

function Root() {
  const app = (
    <PostHogErrorBoundary
      fallback={
        <div className="grid min-h-dvh place-items-center bg-black px-6 text-sm text-white">
          Something went wrong. Refresh and try again.
        </div>
      }
    >
      <App />
    </PostHogErrorBoundary>
  );

  if (!shouldInitPostHog() || !posthogToken) return app;

  return (
    <PostHogProvider apiKey={posthogToken} options={posthogOptions}>
      {app}
    </PostHogProvider>
  );
}

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
