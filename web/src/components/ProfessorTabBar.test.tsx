import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProfessorTabBar } from './ProfessorTabBar';

describe('ProfessorTabBar', () => {
  it('calls onChange when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<ProfessorTabBar active="disciplinas" onChange={onChange} />);

    fireEvent.click(screen.getByText('Aulas'));
    expect(onChange).toHaveBeenCalledWith('aulas');
  });

  it('marks the active tab', () => {
    render(<ProfessorTabBar active="aulas" onChange={vi.fn()} />);
    expect(screen.getByText('Aulas').closest('button')).toHaveAttribute('aria-current', 'page');
  });

  it('only renders Disciplinas and Aulas, no button for the dashboard', () => {
    render(<ProfessorTabBar active="dashboard" onChange={vi.fn()} />);
    expect(screen.getByText('Disciplinas')).toBeInTheDocument();
    expect(screen.getByText('Aulas')).toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });
});
