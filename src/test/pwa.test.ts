/**
 * It stays installable.
 *
 * A browser will not offer to install the app if any one of a short list of
 * things is missing, and it says so only in a console warning nobody reads —
 * so the app quietly stops being installable and everything still *looks*
 * fine. These are that list.
 *
 * What it cannot check is that an icon really is the number of pixels it
 * claims — reading the header would mean pulling in node:fs, and this repo
 * would rather not. A `sizes` that lies makes the browser ignore that icon,
 * so when you replace one, look at the file.
 */
/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';

const manifest = JSON.parse(
  (await import('../../static/manifest.webmanifest?raw')).default as unknown as string
);

/** Every file in static/, keyed by the path the manifest would use to reach it. */
const STATIC = Object.fromEntries(
  Object.entries(
    import.meta.glob('../../static/*', { query: '?url', import: 'default', eager: true })
  ).map(([path, url]) => [path.replace('../../static', ''), url as string])
);

const shell = (await import('../app.html?raw')).default as unknown as string;
const worker = (await import('../service-worker.ts?raw')).default as unknown as string;

describe('the app she can install', () => {
  it('says what it is called, in full and on an icon', () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
    // a home-screen label longer than this is cut off with an ellipsis
    expect(manifest.short_name.length).toBeLessThanOrEqual(12);
  });

  it('opens as an app rather than a browser tab', () => {
    expect(['fullscreen', 'standalone', 'minimal-ui']).toContain(manifest.display);
    expect(manifest.start_url).toBe('/');
    expect(manifest.scope).toBe('/');
    // id pins the app's identity: without it a later change to start_url
    // installs a second, duplicate app rather than updating this one
    expect(manifest.id).toBe('/');
  });

  it('has the two icon sizes a browser insists on, and one that can be masked', () => {
    const icons: { src: string; sizes: string; type: string; purpose?: string }[] = manifest.icons;
    const purposes = icons.flatMap((i) => (i.purpose ?? 'any').split(' '));
    expect(purposes).toContain('any');
    expect(purposes, 'Android crops a square icon into its circle without one').toContain('maskable');

    const sizes = icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    for (const icon of icons) {
      expect(icon.sizes, `${icon.src} needs a square size`).toMatch(/^(\d+)x\1$/);
      expect(icon.type).toBe('image/png');
    }
  });

  it('shows what it looks like, narrow and wide', () => {
    const shots: { src: string; sizes: string; form_factor: string }[] = manifest.screenshots;
    // without one of each, the install dialog falls back to a one-line bar
    expect(shots.map((s) => s.form_factor)).toContain('narrow');
    expect(shots.map((s) => s.form_factor)).toContain('wide');

    for (const shot of shots) {
      const [w, h] = shot.sizes.split('x').map(Number);
      // a portrait picture filed as `wide` is dropped from the dialog
      expect(w > h, `${shot.src} is declared ${shot.form_factor}`).toBe(shot.form_factor === 'wide');
    }
  });

  it('points only at files that exist', () => {
    const referenced = [
      ...manifest.icons.map((i: { src: string }) => i.src),
      ...manifest.screenshots.map((s: { src: string }) => s.src)
    ];
    for (const src of referenced) {
      expect(STATIC[src], `${src} is in the manifest but not in static/`).toBeDefined();
    }
  });

  it('paints the shell in the app’s own colour before a pixel of it loads', () => {
    // the splash screen is drawn from these two, long before any CSS arrives
    expect(manifest.background_color).toBeTruthy();
    expect(manifest.theme_color).toBeTruthy();
    expect(shell, 'the tab colour and the app colour have drifted apart')
      .toContain(`content="${manifest.theme_color}"`);
    expect(shell).toContain('rel="manifest"');
    expect(shell).toContain('rel="apple-touch-icon"');
  });

  it('takes the pages themselves offline, not just the scripts', () => {
    // the bug this replaces: build and files were cached, prerendered was not,
    // so every page she had not already opened was a dinosaur on a plane
    expect(worker).toMatch(/from '\$service-worker'/);
    expect(worker.match(/import \{([^}]*)\} from '\$service-worker'/)?.[1])
      .toContain('prerendered');
    expect(worker).toContain('...prerendered');
  });
});
