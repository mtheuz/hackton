import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './LoginPage';
import { useAuthStore } from '../store/useAuthStore';

vi.mock('../services/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: { id: '1' }, session: { access_token: 'token' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { role: 'teacher', name: 'Professor Demo' },
        error: null,
      }),
    })),
  },
}));

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null });
  });

  it('signs in and stores the user with role/name from the users table', async () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'professor@demo.foco' } });
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'demo1234' } });
    fireEvent.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(useAuthStore.getState().user).toEqual({ id: '1', role: 'teacher', name: 'Professor Demo' });
    });
  });

  it('toggles password visibility', () => {
    render(
      <MemoryRouter>
        <LoginPage />
      </MemoryRouter>,
    );

    const passwordInput = screen.getByLabelText('Senha');
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByLabelText('Mostrar senha'));
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByLabelText('Ocultar senha'));
    expect(passwordInput).toHaveAttribute('type', 'password');
  });
});
