// Generic error reporting utility. Extend this to connect your own monitoring
// service (e.g. Sentry, Datadog, LogRocket).

type ErrorOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  _options?: ErrorOptions,
) {
  // TODO: wire up your own error monitoring service here.
  console.error("[VayaRide error]", error, context);
}
