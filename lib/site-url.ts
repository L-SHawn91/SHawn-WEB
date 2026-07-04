export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  process.env.PRODUCTION_URL ||
  "https://shawnlab.vercel.app"
).replace(/\/$/, "");
