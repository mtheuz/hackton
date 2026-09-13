import { describe, expect, it } from 'vitest';
import { isPptxFile, slideFileName } from './pptxSlides';

describe('isPptxFile', () => {
  it('recognizes a file by its pptx extension', () => {
    const file = new File([new Uint8Array(4)], 'aula.pptx', { type: '' });
    expect(isPptxFile(file)).toBe(true);
  });

  it('recognizes a file by its pptx mime type even with an odd extension', () => {
    const file = new File([new Uint8Array(4)], 'aula.bin', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    });
    expect(isPptxFile(file)).toBe(true);
  });

  it('rejects a non-pptx file', () => {
    const file = new File([new Uint8Array(4)], 'apostila.pdf', { type: 'application/pdf' });
    expect(isPptxFile(file)).toBe(false);
  });
});

describe('slideFileName', () => {
  it('numbers the slide and swaps the extension for png', () => {
    expect(slideFileName('Aula de Frações.pptx', 0)).toBe('Aula de Frações-slide-1.png');
    expect(slideFileName('Aula de Frações.pptx', 4)).toBe('Aula de Frações-slide-5.png');
  });

  it('handles a file name with no extension', () => {
    expect(slideFileName('apresentacao', 1)).toBe('apresentacao-slide-2.png');
  });
});
