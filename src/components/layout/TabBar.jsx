import { NavLink } from 'react-router-dom';
import styles from './TabBar.module.css';

export default function TabBar() {
  return (
    <nav className={styles.tabBar}>
      <NavLink
        to="/"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        end
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L2 12h3v8h6v-6h2v6h6v-8h3L12 2z" />
        </svg>
        <span>Learn</span>
      </NavLink>
      <NavLink
        to="/progress"
        className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
        <span>Progress</span>
      </NavLink>
      <NavLink
        to="/grown-ups"
        className={({ isActive }) => `${styles.tab} ${styles.grownUps} ${isActive ? styles.active : ''}`}
        aria-label="Grown-ups"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
        </svg>
        <span>Grown-ups</span>
      </NavLink>
    </nav>
  );
}
