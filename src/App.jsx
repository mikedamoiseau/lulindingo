import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import useGameStore from './stores/useGameStore';
import { seedDatabase } from './db/seed';
import Onboarding from './components/onboarding/Onboarding';
import ProfilePicker from './components/onboarding/ProfilePicker';
import AppLayout from './components/layout/AppLayout';
import LearningPath from './components/home/LearningPath';
import ProgressScreen from './components/progress/ProgressScreen';
import LessonEngine from './components/lesson/LessonEngine';
import GrownUpCorner from './components/grownups/GrownUpCorner';
import DenScreen from './components/den/DenScreen';
import SettingsPanel from './components/settings/SettingsPanel';

export default function App() {
  const { user, profiles, isLoaded, loadUser } = useGameStore();

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
    // No children at all → straight to onboarding (keeps fresh-start flow
    // unchanged). Children exist but none active → the launch picker.
    return (
      <div className="app-shell">
        {profiles.length === 0 ? <Onboarding /> : <ProfilePicker mode="launch" />}
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
            <Route path="/den" element={<DenScreen />} />
          </Route>
          <Route path="/lesson/:id" element={<LessonEngine />} />
          <Route path="/grown-ups" element={<GrownUpCorner />} />
        </Routes>
        <SettingsPanel />
      </div>
    </BrowserRouter>
  );
}
