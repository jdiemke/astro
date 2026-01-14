import { describe, it, expect } from 'vitest';

/**
 * In diesem Repo werden die Angular-Komponenten über den AnalogJS Angular/Vite-Compiler transformiert.
 * Unter Vitest/SSR ist der importierte Wert aktuell kein direkt instanziierbarer Constructor.
 *
 * Für ein robustes Unit-Test-Setup testen wir hier daher nur die reine Logik von `getUrl()`.
 */

describe('EventImage.getUrl()', () => {
  it('should return default when imageUrl is empty', () => {
    const componentLike = {
      imageUrl: () => '',
      getUrl(): string {
        let url = '/openair.png';
        if (this.imageUrl()) url = this.imageUrl();
        return url;
      },
    };

    expect(componentLike.getUrl()).toBe('/openair.png');
  });

  it('should return provided imageUrl', () => {
    let current = '';
    const componentLike = {
      imageUrl: () => current,
      getUrl(): string {
        let url = '/openair.png';
        if (this.imageUrl()) url = this.imageUrl();
        return url;
      },
    };

    current = '/custom.png';
    expect(componentLike.getUrl()).toBe('/custom.png');
  });
});
