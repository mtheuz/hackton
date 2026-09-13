import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SlideFullscreenModal } from './SlideFullscreenModal';

describe('SlideFullscreenModal', () => {
  it('shows the image full screen for an image slide', () => {
    render(
      <SlideFullscreenModal url="blob:slide-1" fileType="image/png" fileName="slide-1.png" onClose={vi.fn()} />,
    );
    const img = screen.getByRole('img', { name: 'slide-1.png' });
    expect(img).toHaveAttribute('src', 'blob:slide-1');
  });

  it('shows the pdf full screen for a pdf slide', () => {
    render(
      <SlideFullscreenModal url="blob:slide-1" fileType="application/pdf" fileName="apostila.pdf" onClose={vi.fn()} />,
    );
    const frame = screen.getByTitle('apostila.pdf');
    expect(frame.tagName).toBe('IFRAME');
    expect(frame).toHaveAttribute('src', 'blob:slide-1');
  });

  it('calls onClose when the floating close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SlideFullscreenModal url="blob:slide-1" fileType="image/png" fileName="slide-1.png" onClose={onClose} />,
    );
    fireEvent.click(screen.getByLabelText('Fechar'));
    expect(onClose).toHaveBeenCalled();
  });

  it('hides the prev/next controls and position label when no navigation is given', () => {
    render(
      <SlideFullscreenModal url="blob:slide-1" fileType="image/png" fileName="slide-1.png" onClose={vi.fn()} />,
    );
    expect(screen.queryByLabelText('Slide anterior')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Próximo slide')).not.toBeInTheDocument();
  });

  it('shows floating prev/next buttons and the slide position when navigation is given', () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <SlideFullscreenModal
        url="blob:slide-1"
        fileType="image/png"
        fileName="slide-1.png"
        onClose={vi.fn()}
        onPrev={onPrev}
        onNext={onNext}
        hasPrev
        hasNext
        positionLabel="2 de 5"
      />,
    );

    expect(screen.getByText('2 de 5')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Slide anterior'));
    expect(onPrev).toHaveBeenCalled();
    fireEvent.click(screen.getByLabelText('Próximo slide'));
    expect(onNext).toHaveBeenCalled();
  });

  it('disables prev when there is no previous slide and next when there is no next one', () => {
    render(
      <SlideFullscreenModal
        url="blob:slide-1"
        fileType="image/png"
        fileName="slide-1.png"
        onClose={vi.fn()}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        hasPrev={false}
        hasNext={false}
      />,
    );

    expect(screen.getByLabelText('Slide anterior')).toBeDisabled();
    expect(screen.getByLabelText('Próximo slide')).toBeDisabled();
  });
});
