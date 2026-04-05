import { Outlet } from 'react-router-dom';
import TabBar from './TabBar';

export default function AppLayout() {
  return (
    <>
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '72px' }}>
        <Outlet />
      </div>
      <TabBar />
    </>
  );
}
