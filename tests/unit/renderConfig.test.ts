import { describe, expect, it } from 'vitest';
import { isSoftwareRenderer, readGpuRenderer, renderOptions } from '../../src/game/systems/renderConfig';

describe('isSoftwareRenderer', () => {
  it.each([
    'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)',
    'llvmpipe (LLVM 15.0.7, 256 bits)',
    'Mesa Software Rasterizer',
    'Microsoft Basic Render Driver',
  ])('detects %s', (name) => expect(isSoftwareRenderer(name)).toBe(true));

  it.each(['ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11)', 'Apple M1', 'Mali-G78', null, ''])('leaves %s alone', (name) =>
    expect(isSoftwareRenderer(name)).toBe(false));
});

describe('renderOptions', () => {
  it('batches one texture at a time in test mode', () => expect(renderOptions('test', null)).toEqual({ render: { maxTextures: 1 } }));
  it('batches one texture at a time on a software renderer (cut bands in text and images)', () =>
    expect(renderOptions('development', 'SwiftShader')).toEqual({ render: { maxTextures: 1 } }));
  it('keeps the Phaser default on a real GPU', () => expect(renderOptions('production', 'NVIDIA')).toEqual({}));
});

describe('readGpuRenderer', () => {
  const docWith = (gl: unknown) => ({ createElement: () => ({ getContext: () => gl }) }) as unknown as Document;
  it('reads the unmasked renderer', () => {
    const gl = { getExtension: () => ({ UNMASKED_RENDERER_WEBGL: 7 }), getParameter: (p: number) => (p === 7 ? 'SwiftShader' : 'x') };
    expect(readGpuRenderer(docWith(gl))).toBe('SwiftShader');
  });
  it('returns null without WebGL or without the extension', () => {
    expect(readGpuRenderer(docWith(null))).toBeNull();
    expect(readGpuRenderer(docWith({ getExtension: () => null }))).toBeNull();
  });
});
