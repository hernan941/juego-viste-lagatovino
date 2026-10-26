// A4: software WebGL (SwiftShader in headless Chromium, llvmpipe, the Windows basic driver) draws Phaser's multi-texture
// batches with bands cut out of whatever shares the batch: Text glyphs, stars, numbers. It is not about rotation or Text:
// it shows up while many textures animate at once (the runway notes), and it never appears with one texture per batch.
// Real GPUs are fine, so only software renderers (and test mode, ADR 0012) batch one texture at a time.

const SOFTWARE = /swiftshader|llvmpipe|software|basic render/i;

export function isSoftwareRenderer(name: string | null): boolean {
  return !!name && SOFTWARE.test(name);
}

/** The `GameConfig` fragment for the renderer: empty keeps Phaser's default. */
export function renderOptions(mode: string, gpuRenderer: string | null): { render?: { maxTextures: number } } {
  return mode === 'test' || isSoftwareRenderer(gpuRenderer) ? { render: { maxTextures: 1 } } : {};
}

/** The unmasked name of the GPU, or null when WebGL or the extension is not there. */
export function readGpuRenderer(doc: Document): string | null {
  const gl = doc.createElement('canvas').getContext('webgl') as WebGLRenderingContext | null;
  const ext = gl?.getExtension('WEBGL_debug_renderer_info');
  return gl && ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : null;
}
