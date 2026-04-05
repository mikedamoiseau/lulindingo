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
    </nav>
  );
}
