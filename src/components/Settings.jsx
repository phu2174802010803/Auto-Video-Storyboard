import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import './Settings.css';

const Settings = () => {
    const { apiKey, saveApiKey } = useApp();
    const { success, warning, error } = useToast();
    const [tempApiKey, setTempApiKey] = useState(apiKey);
    const [showApiKey, setShowApiKey] = useState(false);

    // Veo3 Accounts Management
    const [veo3Accounts, setVeo3Accounts] = useState(() => {
        const saved = localStorage.getItem('veo3-accounts');
        return saved ? JSON.parse(saved) : [];
    });
    const [showAddAccount, setShowAddAccount] = useState(false);
    const [newAccountCookie, setNewAccountCookie] = useState('');

    const handleSave = () => {
        if (!tempApiKey.trim()) {
            warning('Vui lòng nhập API Key');
            return;
        }
        saveApiKey(tempApiKey);
        success('Đã lưu cài đặt!');
    };

    const handleClear = () => {
        if (confirm('Bạn có chắc muốn xóa tất cả dữ liệu?')) {
            localStorage.clear();
            window.location.reload();
        }
    };

    // Veo3 Account Management Functions
    const [isValidating, setIsValidating] = useState(false);
    const [validationProgress, setValidationProgress] = useState('');

    const handleAddAccount = async () => {
        if (!newAccountCookie.trim()) {
            warning('Vui lòng paste cookie vào!');
            return;
        }

        setIsValidating(true);
        setValidationProgress('🚀 Đang khởi động kiểm tra...');

        // Listen to validation progress updates
        const progressListener = (message) => {
            console.log('[UI] Validation progress:', message);
            setValidationProgress(message);
        };

        const listenerRef = window.electronAPI.on('validation-progress', progressListener);

        try {
            const result = await window.electronAPI.validateVeo3Cookie({
                cookieString: newAccountCookie.trim()
            });

            if (result.success) {
                const newAccount = {
                    id: Date.now(),
                    name: result.email || `Tài khoản ${Date.now()}`,
                    email: result.email,
                    cookie: result.cookieString, // Store cookie string
                    createdAt: new Date().toISOString(),
                    validated: true
                };

                const updatedAccounts = [...veo3Accounts, newAccount];
                setVeo3Accounts(updatedAccounts);
                localStorage.setItem('veo3-accounts', JSON.stringify(updatedAccounts));

                setNewAccountCookie('');
                setShowAddAccount(false);
                setValidationProgress('');
                success(result.message);
            } else {
                setValidationProgress('');
                error(result.error);
            }
        } catch (err) {
            console.error('Validation error:', err);
            setValidationProgress('');
            error('Lỗi khi kiểm tra cookie: ' + err.message);
        } finally {
            // Clean up listener
            window.electronAPI.removeListener('validation-progress', listenerRef);
            setIsValidating(false);
        }
    };

    const handleDeleteAccount = (id) => {
        if (confirm('Bạn có chắc muốn xóa tài khoản này?')) {
            const updatedAccounts = veo3Accounts.filter(acc => acc.id !== id);
            setVeo3Accounts(updatedAccounts);
            localStorage.setItem('veo3-accounts', JSON.stringify(updatedAccounts));
            success('Đã xóa tài khoản!');
        }
    };

    return (
        <div className="settings">
            <div className="settings-header">
                <h2>Cài đặt</h2>
                <p>Cấu hình ứng dụng và quản lý dữ liệu</p>
            </div>

            <div className="settings-content">
                {/* API Settings */}
                <div className="settings-section">
                    <div className="section-header">
                        <h3>🔑 API Configuration</h3>
                        <p>Cài đặt Google Gemini API Key</p>
                    </div>

                    <div className="input-group">
                        <label>Gemini API Key</label>
                        <div className="api-key-input">
                            <input
                                type={showApiKey ? 'text' : 'password'}
                                value={tempApiKey}
                                onChange={(e) => setTempApiKey(e.target.value)}
                                placeholder="Nhập API Key của bạn..."
                            />
                            <button
                                className="toggle-visibility"
                                onClick={() => setShowApiKey(!showApiKey)}
                            >
                                {showApiKey ? '🙈' : '👁️'}
                            </button>
                        </div>
                        <p className="input-hint">
                            Lấy API Key miễn phí tại:{' '}
                            <a
                                href="https://aistudio.google.com/app/apikey"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                Google AI Studio
                            </a>
                        </p>
                    </div>

                    <button className="save-btn" onClick={handleSave}>
                        💾 Lưu cài đặt
                    </button>
                </div>

                {/* Veo3 Accounts Management */}
                <div className="settings-section">
                    <div className="section-header">
                        <h3>🔐 Tài Khoản Veo 3</h3>
                        <p>Quản lý tài khoản Google để tạo video với Veo 3</p>
                    </div>

                    {veo3Accounts.length === 0 ? (
                        <div className="empty-accounts">
                            <span className="empty-icon">👤</span>
                            <p>Chưa có tài khoản nào</p>
                            <p className="hint">Thêm tài khoản Google để sử dụng Veo 3</p>
                        </div>
                    ) : (
                        <div className="accounts-list">
                            {veo3Accounts.map(account => (
                                <div key={account.id} className="account-card">
                                    <div className="account-info">
                                        <div className="account-avatar">
                                            <span>{account.email ? account.email.charAt(0).toUpperCase() : '👤'}</span>
                                        </div>
                                        <div className="account-details">
                                            <div className="account-header-row">
                                                <h4>{account.name}</h4>
                                                {account.validated && (
                                                    <span className="verified-badge" title="Đã xác thực">✅</span>
                                                )}
                                            </div>
                                            {account.email && (
                                                <p className="account-email">
                                                    📧 {account.email}
                                                </p>
                                            )}
                                            <p className="account-date">
                                                📅 {new Date(account.createdAt).toLocaleString('vi-VN')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="account-actions">
                                        <button
                                            className="btn-delete"
                                            onClick={() => handleDeleteAccount(account.id)}
                                            title="Xóa tài khoản"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {showAddAccount && (
                        <div className="add-account-form">
                            <div className="input-group">
                                <label>Cookie String <span className="required">*</span></label>
                                <textarea
                                    value={newAccountCookie}
                                    onChange={(e) => setNewAccountCookie(e.target.value)}
                                    placeholder="Paste toàn bộ cookies từ DevTools (Application → Cookies → labs.google)"
                                    rows={6}
                                />
                                <div className="input-hint">
                                    <strong>💡 Cách lấy cookie:</strong><br />
                                    1. Mở <code>https://labs.google/fx/vi/tools/flow</code> và đăng nhập<br />
                                    2. Nhấn <kbd>F12</kbd> → Tab <strong>Application</strong> → <strong>Cookies</strong> → <code>labs.google</code><br />
                                    3. Click vào dòng đầu tiên, nhấn <kbd>Ctrl+A</kbd> để chọn tất cả<br />
                                    4. Nhấn <kbd>Ctrl+C</kbd> để copy và paste vào đây
                                </div>
                            </div>

                            {isValidating && (
                                <div className="validation-progress">
                                    <p className="progress-message">
                                        {validationProgress || '� Đang khởi động...'}
                                    </p>
                                    <div className="progress-bar">
                                        <div className="progress-bar-fill"></div>
                                    </div>
                                    <p className="progress-hint">
                                        💡 Browser sẽ mở tự động và kiểm tra đăng nhập (~15-20 giây)
                                    </p>
                                </div>
                            )}

                            <div className="form-actions">
                                <button
                                    className="btn-validate"
                                    onClick={handleAddAccount}
                                    disabled={isValidating || !newAccountCookie.trim()}
                                >
                                    {isValidating ? '⏳ Đang kiểm tra...' : '✅ Xác thực & Lưu'}
                                </button>
                                <button
                                    className="btn-cancel"
                                    onClick={() => {
                                        setShowAddAccount(false);
                                        setNewAccountCookie('');
                                    }}
                                    disabled={isValidating}
                                >
                                    ❌ Hủy
                                </button>
                            </div>
                        </div>
                    )}

                    {!showAddAccount && (
                        <button
                            className="add-account-btn"
                            onClick={() => setShowAddAccount(true)}
                        >
                            ➕ Thêm Tài Khoản
                        </button>
                    )}
                </div>

                {/* App Info */}
                <div className="settings-section">
                    <div className="section-header">
                        <h3>ℹ️ Thông tin ứng dụng</h3>
                    </div>

                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Tên ứng dụng</span>
                            <span className="info-value">Auto Veo Storyboard</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Phiên bản</span>
                            <span className="info-value">1.0.0</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">AI Model</span>
                            <span className="info-value">Gemini 2.0 Flash</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Chuyên ngành</span>
                            <span className="info-value">Video Storyboard</span>
                        </div>
                    </div>
                </div>

                {/* Data Management */}
                <div className="settings-section">
                    <div className="section-header">
                        <h3>🗄️ Quản lý dữ liệu</h3>
                        <p>Xóa tất cả storyboard và metadata đã lưu</p>
                    </div>

                    <div className="danger-zone">
                        <div className="warning-box">
                            <span className="warning-icon">⚠️</span>
                            <div>
                                <h4>Vùng nguy hiểm</h4>
                                <p>Hành động này không thể hoàn tác. Tất cả dữ liệu sẽ bị xóa vĩnh viễn.</p>
                            </div>
                        </div>

                        <button className="danger-btn" onClick={handleClear}>
                            🗑️ Xóa tất cả dữ liệu
                        </button>
                    </div>
                </div>

                {/* Features Overview */}
                <div className="settings-section">
                    <div className="section-header">
                        <h3>✨ Tính năng</h3>
                    </div>

                    <div className="features-list">
                        <div className="feature-item">
                            <span className="feature-icon">�</span>
                            <div className="feature-text">
                                <h4>Tạo từ Chủ đề</h4>
                                <p>Tạo nội dung Toán học từ chủ đề hoặc bài toán</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🔗</span>
                            <div className="feature-text">
                                <h4>Tạo từ URL</h4>
                                <p>Biến bài viết Toán học thành nội dung giáo dục</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">🏷️</span>
                            <div className="feature-text">
                                <h4>Tạo Metadata</h4>
                                <p>Tự động tạo tiêu đề, mô tả và hashtags</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">📊</span>
                            <div className="feature-text">
                                <h4>29 Phong cách Toán học</h4>
                                <p>Giải thích đơn giản, chứng minh, ứng dụng...</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">📝</span>
                            <div className="feature-text">
                                <h4>Tùy chỉnh Độ dài</h4>
                                <p>Từ 1000 đến 20000 từ hoặc tùy chỉnh</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <span className="feature-icon">📚</span>
                            <div className="feature-text">
                                <h4>Quản lý Lịch sử</h4>
                                <p>Lưu trữ, tìm kiếm và xuất nội dung Toán học</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
