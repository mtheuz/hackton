import { describe, expect, it } from 'vitest';
import { validateContentFile, CONTENT_FILE_ACCEPT } from './contentFile';

function makeFile(name: string, type: string, sizeBytes = 1024): File {
  return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe('validateContentFile', () => {
  it('accepts a pptx file by mime type', () => {
    const file = makeFile(
      'aula.pptx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    );
    expect(validateContentFile(file)).toBeNull();
  });

  it('accepts a pptx file by extension when the browser reports no mime type', () => {
    const file = makeFile('aula.pptx', '');
    expect(validateContentFile(file)).toBeNull();
  });

  it('lists pptx in the accept attribute', () => {
    expect(CONTENT_FILE_ACCEPT).toContain('.pptx');
  });
});
