/**
 * Device quality tier. Low-end devices (Android TV boxes, cheap phones)
 * cannot afford supersampled texture bakes or MSAA: a 2 GB Mi TV Stick gets
 * OOM-killed at ~950 MB RSS with resolution-2 + antialiased RenderTextures,
 * while the same game fits in ~85 MB with this mode on.
 *
 * navigator.deviceMemory is capped at 8 and only reports powers of two;
 * ≤3 reliably identifies the 1-2 GB class. Browsers without the API
 * (Safari, Firefox) are treated as high-end — they are desktops in practice.
 */
export const LOW_END_DEVICE: boolean = (() => {
  const mem = (navigator as { deviceMemory?: number }).deviceMemory;
  return typeof mem === 'number' && mem <= 3;
})();

/** Texture bake supersampling: crisp on desktop, memory-lean on TV boxes. */
export const BAKE_RESOLUTION = LOW_END_DEVICE ? 1 : 2;

/** MSAA for the main canvas and baked render textures. */
export const ANTIALIAS = !LOW_END_DEVICE;
