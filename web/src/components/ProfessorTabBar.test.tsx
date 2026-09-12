import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfessorTabBar } from './ProfessorTabBar';

describe('ProfessorTabBar', () => {
  it('calls onChange when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<ProfessorTabBar active="aula" onChange={onChange} />);

    fireEvent.click(screen.getByText('Turmas'));
    expect(onChange).toHaveBeenCalledWith('turmas');
  });

  it('marks the active tab', () => {
    render(<ProfessorTabBar active="turmas" onChange={vi.fn()} />);
    expect(screen.getByText('Turmas').closest('button')).toHaveAttribute('aria-current', 'page');
  });
});
