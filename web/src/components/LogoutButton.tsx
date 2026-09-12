import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';

export function LogoutButton() {
  const signOut = useAuthStore((s) => s.signOut);
  const navigate = useNavigate();

  async function handleLogout() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-full border border-line-200 px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors duration-200 hover:border-danger-600 hover:text-danger-600"
    >
      Sair
    </button>
  );
}
