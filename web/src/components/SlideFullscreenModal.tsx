import CrossMarkButtonIcon from '~icons/twemoji/cross-mark-button';
import LeftArrowIcon from '~icons/twemoji/left-arrow';
import RightArrowIcon from '~icons/twemoji/right-arrow';

interface SlideFullscreenModalProps {
  url: string;
  fileType: string | null;
  fileName: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  positionLabel?: string;
}

const FLOATING_BUTTON_CLASSNAME =
  'flex h-11 w-11 items-center justify-center rounded-full bg-surface/90 shadow-lg backdrop-blur transition-transform active:scale-95 disabled:opacity-40 disabled:active:scale-100';

export function SlideFullscreenModal({
  url,
  fileType,
  fileName,
  onClose,
  onPrev,
  onNext,
  hasPrev = true,
  hasNext = true,
  positionLabel,
}: SlideFullscreenModalProps) {
  const isImage = fileType?.startsWith('image/') ?? false;
  const isPdf = fileType === 'application/pdf';

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/95 p-4">
      {positionLabel && (
        <span className="absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-surface/90 px-3 py-1 text-xs font-semibold text-ink-900 shadow-sm">
          {positionLabel}
        </span>
      )}

      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className={`${FLOATING_BUTTON_CLASSNAME} absolute right-4 top-4`}
      >
        <CrossMarkButtonIcon aria-hidden className="h-5 w-5" />
      </button>

      {onPrev && (
        <button
          type="button"
          aria-label="Slide anterior"
          disabled={!hasPrev}
          onClick={onPrev}
          className={`${FLOATING_BUTTON_CLASSNAME} absolute left-4 top-1/2 -translate-y-1/2`}
        >
          <LeftArrowIcon aria-hidden className="h-5 w-5" />
        </button>
      )}

      <div className="flex h-full w-full max-w-4xl items-center justify-center overflow-hidden px-16">
        {isImage && <img src={url} alt={fileName} className="max-h-full max-w-full object-contain" />}
        {isPdf && <iframe title={fileName} src={url} className="h-full w-full rounded-lg bg-white" />}
        {!isImage && !isPdf && <p className="text-sm text-white">{fileName}</p>}
      </div>

      {onNext && (
        <button
          type="button"
          aria-label="Próximo slide"
          disabled={!hasNext}
          onClick={onNext}
          className={`${FLOATING_BUTTON_CLASSNAME} absolute right-4 top-1/2 -translate-y-1/2`}
        >
          <RightArrowIcon aria-hidden className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
