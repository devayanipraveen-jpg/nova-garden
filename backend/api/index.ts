import { createApp } from "../src/app";

// Vercel invokes this module as a serverless function per request.
// Do NOT call app.listen() here - that's for the local dev server (src/server.ts) only.
export default createApp();
