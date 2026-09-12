import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToggleSwitch } from './ToggleSwitch';

describe('ToggleSwitch', () => {
  it('is findable and togglable by its label', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch label="Modo acessibilidade" checked={false} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText('Modo acessibilidade'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflects the checked state', () => {
    render(<ToggleSwitch label="Modo acessibilidade" checked={true} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Modo acessibilidade')).toBeChecked();
  });
});
