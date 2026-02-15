import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import './Layout.css';

// 导航图标映射
const navIcons = {
    dashboard: '/assets/icon-dashboard-new.png',
    pos: '/assets/icon-pos-new.png',
    kds: '/assets/icon-kds-new.png',
    delivery: '/assets/icon-delivery-new.png',
    ai: '/assets/icon-ai-new.png',
    tables: '/assets/icon-pos-new.png',
    orders: '/assets/icon-orders-new.png',
    menu: '/assets/icon-menu-new.png',
    reports: '/assets/icon-dashboard-new.png',
    staff: '/assets/icon-profile-new.png',
    customers: '/assets/icon-profile-new.png',
    settings: '/assets/icon-settings-new.png',
};

// 侧边栏导航项 - 完整的餐饮管理系统
const navItems = [
    { path: '/', icon: navIcons.dashboard, label: '仪表盘', exact: true },
    { path: '/pos', icon: navIcons.pos, label: 'POS 点餐' },
    { path: '/kds', icon: navIcons.kds, label: '厨房 KDS' },
    { path: '/tables', icon: navIcons.tables, label: '桌位管理' },
    { path: '/orders', icon: navIcons.orders, label: '订单管理' },
    { path: '/menu', icon: navIcons.menu, label: '菜单管理' },
    { path: '/delivery', icon: navIcons.delivery, label: '外卖管理' },
    { path: '/ai-receptionist', icon: navIcons.ai, label: 'AI 接线员' },
    { path: '/reports', icon: navIcons.reports, label: '报表分析' },
    { path: '/staff', icon: navIcons.staff, label: '员工管理' },
    { path: '/customers', icon: navIcons.customers, label: '顾客管理' },
    { path: '/settings', icon: navIcons.settings, label: '系统设置' },
];

export const Layout: React.FC = () => {
    return (
        <div className="layout">
            {/* 侧边栏 */}
            <aside className="sidebar">
                <div className="sidebar-header">
                    <Link to="/" className="sidebar-logo">
                        <img
                            src="/assets/synapseoslogo.png"
                            alt="Synapse OS"
                            style={{
                                height: 'auto',
                                width: '180px',
                                objectFit: 'contain',
                                display: 'block'
                            }}
                        />
                    </Link>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.exact}
                            className={({ isActive }) =>
                                `nav-link ${isActive ? 'active' : ''}`
                            }
                        >
                            <img src={item.icon} alt={item.label} className="nav-icon" style={{ width: '22px', height: '22px' }} />
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <div className="user-card">
                        <div className="user-avatar">
                            <img src="/assets/icon-profile-new.png" alt="User" style={{ width: '22px', height: '22px', filter: 'brightness(0) invert(1)' }} />
                        </div>
                        <div className="user-info">
                            <div className="user-name">Demo 餐厅</div>
                            <div className="user-role">管理员</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* 主内容区 */}
            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
};

export default Layout;
