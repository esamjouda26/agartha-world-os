import "server-only";

import pino from "pino";

const isProduction = process.env.NODE_ENV === "production";

export const logger = pino({
  level: isProduction ? "info" : "debug",
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "token",
      "session",
      "authorization",
      "cookie",
      "refresh_token",
      "access_token",
      "*.password",
      "*.token",
      "*.authorization",
      "*.refresh_token",
      "*.access_token",
    ],
    censor: "[REDACTED]",
  },
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export type LogContext = {
  request_id?: string;
  user_id?: string;
  feature?: string;
  event?: string;
};

export function loggerWith(context: LogContext) {
  return logger.child(context);
}
