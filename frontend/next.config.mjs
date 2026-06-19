import { withSentryConfig } from "@sentry/nextjs"

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
}

export default withSentryConfig(nextConfig, {
  org: "the-tangle-trove",
  project: "homeschool-compass",

  // Suppress source map upload logs in CI
  silent: true,

  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,

  // Includes source maps in Sentry error reports
  hideSourceMaps: false,
})
