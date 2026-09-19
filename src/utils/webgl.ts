/**
 * Probe for usable WebGL support.
 *
 * Pannellum does not throw when WebGL is unavailable — it swallows the failure
 * and renders its own black error panel instead. That means a try/catch around
 * `pannellum.viewer()` never fires, and the app's branded fallbacks never get a
 * chance to show. Probing up front lets callers skip Pannellum entirely.
 *
 * The result is cached: creating a context is not free, and support cannot
 * change within a page lifetime.
 */
let cached: boolean | null = null;

export function supportsWebGL(): boolean {
  if (cached !== null) return cached;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cached = Boolean(gl);
  } catch {
    // Some browsers throw outright rather than returning null.
    cached = false;
  }

  return cached;
}
