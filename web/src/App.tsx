import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AlunoHome } from './pages/AlunoHome';
import { ProfessorHome } from './pages/ProfessorHome';
import { EscolaHome } from './pages/EscolaHome';
import { RequireRole } from './components/RequireRole';
import { useAuthStore } from './store/useAuthStore';

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/aluno" element={<RequireRole role="student"><AlunoHome /></RequireRole>} />
        <Route path="/professor" element={<RequireRole role="teacher"><ProfessorHome /></RequireRole>} />
        <Route path="/escola" element={<RequireRole role="school_admin"><EscolaHome /></RequireRole>} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
