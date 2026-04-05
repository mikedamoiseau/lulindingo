import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useGameStore from './stores/useGameStore';
import { seedDatabase } from './db/seed';
import Onboarding from './components/onboarding/Onboarding';

export default function App() {
  const { user, isLoaded, loadUser } = useGameStore();

  useEffect(() => {
    seedDatabase().then(() => loadUser());
  }, [loadUser]);

  if (!isLoaded) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-lg)' }}>Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <Onboarding />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<div style={{ padding: '24px' }}>Welcome back, {user.name}!</div>} />
          <Route path="/lesson/:id" element={<div>Lesson</div>} />
          <Route path="/progress" element={<div>Progress</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
