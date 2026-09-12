import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DisciplinaManager } from './DisciplinaManager';

describe('DisciplinaManager', () => {
  it('creates a new discipline', () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(<DisciplinaManager disciplines={[]} onCreate={onCreate} onRename={vi.fn()} />);

    fireEvent.change(screen.getByLabelText('Nova disciplina'), { target: { value: 'Matemática' } });
    fireEvent.click(screen.getByText('Criar'));

    expect(onCreate).toHaveBeenCalledWith('Matemática');
  });

  it('renames an existing discipline', () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    render(
      <DisciplinaManager
        disciplines={[{ id: 'disc-1', name: 'Matemática' }]}
        onCreate={vi.fn()}
        onRename={onRename}
      />,
    );

    fireEvent.click(screen.getByText('Renomear'));
    fireEvent.change(screen.getByLabelText('Renomear Matemática'), { target: { value: 'Matemática Básica' } });
    fireEvent.click(screen.getByText('Salvar'));

    expect(onRename).toHaveBeenCalledWith('disc-1', 'Matemática Básica');
  });
});
