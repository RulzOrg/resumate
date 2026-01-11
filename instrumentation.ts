import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");

    // Handle connection errors gracefully (common in development)
    // These errors occur when clients disconnect before requests complete
    // Only set up handlers if process is available (not in edge runtime)
    if (typeof process !== "undefined" && process.on) {
      const isConnectionError = (error: unknown): boolean => {
        if (error && typeof error === "object") {
          if ("code" in error && error.code === "ECONNRESET") {
            return true;
          }
          if (
            "message" in error &&
            typeof error.message === "string" &&
            error.message.includes("aborted")
          ) {
            return true;
          }
        }
        return false;
      };

      process.on("uncaughtException", async (error: Error) => {
        // Suppress harmless connection reset errors
        if (isConnectionError(error)) {
          return;
        }

        console.error("Uncaught exception:", error);
        Sentry.captureException(error);

        try {
          await Sentry.flush(2000);
        } catch (err) {
          console.error("Failed to flush Sentry on uncaught exception", err);
        }

        process.exit(1);
      });

      process.on("unhandledRejection", async (reason: unknown) => {
        // Suppress connection-related promise rejections
        if (isConnectionError(reason)) {
          return;
        }

        console.error("Unhandled promise rejection:", reason);

        // Capture in Sentry, converting non-Errors if needed
        const error = reason instanceof Error ? reason : new Error(String(reason));
        Sentry.captureException(error);

        // Ensure event is sent
        await Sentry.flush(2000);
      });
    }
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
