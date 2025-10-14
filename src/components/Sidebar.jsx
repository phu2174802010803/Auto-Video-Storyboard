import React from 'react';
import './Sidebar.css';

const Sidebar = ({ activeView, setActiveView, collapsed, setCollapsed }) => {
    const menuItems = [
        { id: 'create', icon: '🎬', label: 'Tạo Storyboard', badge: null },
        { id: 'prompt', icon: '📝', label: 'Tạo Prompt Video', badge: null },
        { id: 'veo3', icon: '🎥', label: 'Tạo Video Veo3', badge: null },
        { id: 'history', icon: '📚', label: 'Lịch sử', badge: null },
        { id: 'settings', icon: '⚙️', label: 'Cài đặt', badge: null }
    ];

    return (
        <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
            <button
                className="collapse-btn"
                onClick={() => setCollapsed(!collapsed)}
                title={collapsed ? 'Mở rộng' : 'Thu gọn'}
            >
                {collapsed ? '→' : '←'}
            </button>

            <nav className="sidebar-nav">
                {menuItems.map(item => (
                    <button
                        key={item.id}
                        className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                        onClick={() => setActiveView(item.id)}
                        title={collapsed ? item.label : ''}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        {!collapsed && <span className="nav-label">{item.label}</span>}
                        {!collapsed && item.badge && (
                            <span className="nav-badge">{item.badge}</span>
                        )}
                    </button>
                ))}
            </nav>

            {!collapsed && (
                <div className="sidebar-footer">
                    <p className="footer-text">
                        Phát triển bởi <strong>Phu Chu</strong>
                    </p>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
