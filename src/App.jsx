import React, { useState, useEffect } from 'react';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import StoryCreator from './components/StoryCreator';
import PromptGenerator from './components/PromptGenerator';
import StoryHistory from './components/StoryHistory';
import Settings from './components/Settings';
import './App.css';

function App() {
    const [activeView, setActiveView] = useState('create');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    return (
        <ToastProvider>
            <AppProvider>
                <div className="app">
                    <Header />
                    <div className="app-body">
                        <Sidebar
                            activeView={activeView}
                            setActiveView={setActiveView}
                            collapsed={sidebarCollapsed}
                            setCollapsed={setSidebarCollapsed}
                        />
                        <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''}`}>
                            <div className="content-wrapper">
                                {activeView === 'create' && <StoryCreator />}
                                {activeView === 'prompt' && <PromptGenerator />}
                                {activeView === 'history' && <StoryHistory />}
                                {activeView === 'settings' && <Settings />}
                            </div>
                        </main>
                    </div>
                </div>
            </AppProvider>
        </ToastProvider>
    );
}

export default App;
