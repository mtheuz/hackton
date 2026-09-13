const PPTX_EXTENSION = 'pptx';
const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

const DEFAULT_SLIDE_WIDTH = 960;
const DEFAULT_SLIDE_HEIGHT = 540;

export function isPptxFile(file: File): boolean {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  return ext === PPTX_EXTENSION || file.type === PPTX_MIME_TYPE;
}

export function slideFileName(originalName: string, index: number): string {
  const base = originalName.includes('.') ? originalName.slice(0, originalName.lastIndexOf('.')) : originalName;
  return `${base}-slide-${index + 1}.png`;
}

function waitForPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/**
 * Renders every slide of a .pptx file offscreen (via pptx-preview) and rasterizes
 * each one (via html2canvas) into its own PNG File, so the existing per-file
 * slide deck UI (attach/prev/next/push) can treat a pptx exactly like a set of
 * individually attached slide images — no server-side conversion needed.
 */
export async function expandPptxToSlideImages(file: File): Promise<File[]> {
  const [{ init }, { default: html2canvas }] = await Promise.all([
    import('pptx-preview'),
    import('html2canvas'),
  ]);

  const width = DEFAULT_SLIDE_WIDTH;
  const height = DEFAULT_SLIDE_HEIGHT;

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-10000px';
  container.style.top = '0px';
  container.style.width = `${width}px`;
  container.style.height = `${height}px`;
  document.body.appendChild(container);

  const previewer = init(container, { width, height });

  try {
    const buffer = await file.arrayBuffer();
    await previewer.preview(buffer);

    const files: File[] = [];
    for (let index = 0; index < previewer.slideCount; index += 1) {
      previewer.renderSingleSlide(index);
      await waitForPaint();
      const canvas = await html2canvas(container, { width, height });
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Falha ao gerar imagem do slide.'))), 'image/png');
      });
      files.push(new File([blob], slideFileName(file.name, index), { type: 'image/png' }));
    }
    return files;
  } finally {
    previewer.destroy();
    container.remove();
  }
}
