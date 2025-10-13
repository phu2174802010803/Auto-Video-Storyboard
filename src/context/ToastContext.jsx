import React, { createContext, useState, useContext, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, type = 'info', duration = 3000) => {
        const id = Date.now() + Math.random();
        const toast = { id, message, type };

        setToasts(prev => [...prev, toast]);

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id);
            }, duration);
        }
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const success = useCallback((message, duration) => {
        addToast(message, 'success', duration);
    }, [addToast]);

    const error = useCallback((message, duration) => {
        addToast(message, 'error', duration);
    }, [addToast]);

    const warning = useCallback((message, duration) => {
        addToast(message, 'warning', duration);
    }, [addToast]);

    const info = useCallback((message, duration) => {
        addToast(message, 'info', duration);
    }, [addToast]);

    return (
        <ToastContext.Provider value={{ success, error, warning, info }}>
            {children}
            <div className="toast-container">
                {toasts.map(toast => (
                    <div key={toast.id} className={`toast ${toast.type}`}>
                        <div className="toast-icon">
                            {toast.type === 'success' && '✓'}
                            {toast.type === 'error' && '✕'}
                            {toast.type === 'warning' && '⚠'}
                            {toast.type === 'info' && 'ℹ'}
                        </div>
                        <div className="toast-message">{toast.message}</div>
                        <button
                            className="toast-close"
                            onClick={() => removeToast(toast.id)}
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
