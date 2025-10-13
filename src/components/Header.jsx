import React, { useState } from 'react';
import './Header.css';

const Header = () => {
    const [version, setVersion] = useState('1.0.0');

    React.useEffect(() => {
        if (window.electronAPI) {
            window.electronAPI.getAppVersion().then(v => setVersion(v));
        }
    }, []);

    return (
        <header className="header">
            <div className="header-content">
                <div className="logo-section">
                    <div className="logo-icon">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                            <path d="M16 4L28 10L16 16L4 10L16 4Z" fill="currentColor" opacity="0.8" />
                            <path d="M4 16L16 22L28 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M4 22L16 28L28 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="logo-text">
                        <h1>Auto Veo Storyboard</h1>
                        <span className="subtitle">AI Video Storyboard Generator</span>
                    </div>
                </div>
                <div className="header-info">
                    <span className="version-badge">v{version}</span>
                </div>
            </div>
        </header>
    );
};

export default Header;
