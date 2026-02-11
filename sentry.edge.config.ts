import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://5da12a0603ef5ec13fe523cfc4dbc6c1@o4510869418147840.ingest.us.sentry.io/4510869750022144",

  // Set tracesSampleRate to 1.0 to capture 100% of transactions for tracing.
  // We recommend adjusting this value in production
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
