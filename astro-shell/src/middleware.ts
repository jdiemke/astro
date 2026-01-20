import { defineMiddleware } from "astro/middleware";

const UPSTREAM_BASE_URL = "http://astro-fragment:4321";

/**
 * Welche Requests sollen vom Shell-Server zum Fragment durchgereicht werden?
 *
 * Hintergrund:
 * - Astro Islands/Hydration laden Assets typischerweise unter `/_astro/*`.
 * - Analog/Angular bringt zusätzlich Runtime-Chunks + ggf. Sourcemaps/CSS mit.
 * - Wenn wir nur `.js` proxien, fehlen u.U. CSS/Maps/Images und die Hydration bricht still.
 */
function shouldProxyToUpstream(pathname: string) {
  if (pathname.startsWith("/_astro/")) return true;

  // Fallback: typische Asset-Endungen, falls sie nicht unter /_astro liegen.
  return /(\.(?:js|mjs|css|map|png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|eot))$/i.test(pathname);
}

export const onRequest = defineMiddleware(async (context, next) => {
  if (shouldProxyToUpstream(context.url.pathname)) {
    const upstreamUrl = new URL(context.url.pathname + context.url.search, UPSTREAM_BASE_URL);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: context.request.method,
      headers: context.request.headers,
    });

    const headers = new Headers(upstreamResponse.headers);

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers,
    });
  }

  return next();
});
