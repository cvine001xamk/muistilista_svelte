// Disable SSR to serve the app shell instantly as a static PWA from edge CDN,
// eliminating Vercel serverless cold starts on mobile startup.
export const ssr = false;
export const prerender = false;

