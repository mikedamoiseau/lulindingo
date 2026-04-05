import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useGameStore from './stores/useGameStore';
import { seedDatabase } from './db/seed';
import Onboarding from './components/onboarding/Onboarding';
import AppLayout from './components/layout/AppLayout';
import LearningPath from './components/home/LearningPath';
import ProgressScreen from './components/progress/ProgressScreen';
import LessonEngine from './components/lesson/LessonEngine';
import SettingsPanel from './components/settings/SettingsPanel';

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
          <Route element={<AppLayout />}>
            <Route path="/" element={<LearningPath />} />
            <Route path="/progress" element={<ProgressScreen />} />
          </Route>
          <Route path="/lesson/:id" element={<LessonEngine />} />
        </Routes>
        <SettingsPanel />
      </div>
    </BrowserRouter>
  );
}
