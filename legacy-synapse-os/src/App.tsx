import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import MusicPlayer from './components/MusicPlayer/MusicPlayer';
import { NetworkStatus } from './components/NetworkStatus';
import { Dashboard } from './pages/Dashboard';
import { POS } from './pages/POS';
import { KDS } from './pages/KDS';
import { Delivery } from './pages/Delivery';
import { Customers } from './pages/Customers';
import { Reports } from './pages/Reports';
import { Staff } from './pages/Staff';
import { Tables } from './pages/Tables';
import { Orders } from './pages/Orders';
import { Menu } from './pages/Menu';
import { Settings } from './pages/Settings';
import { AIReceptionist } from './pages/AIReceptionist';
import './index.css';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="pos" element={<POS />} />
          <Route path="kds" element={<KDS />} />
          <Route path="delivery" element={<Delivery />} />
          <Route path="ai-receptionist" element={<AIReceptionist />} />
          <Route path="tables" element={<Tables />} />
          <Route path="orders" element={<Orders />} />
          <Route path="menu" element={<Menu />} />
          <Route path="reports" element={<Reports />} />
          <Route path="staff" element={<Staff />} />
          <Route path="customers" element={<Customers />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      {/* 全局音乐播放器 */}
      <MusicPlayer />
      {/* 网络状态指示器 */}
      <NetworkStatus />
    </BrowserRouter>
  );
}

export default App;
