import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import './Settings.css';

const Settings = () => {
    const { apiKey, saveApiKey } = useApp();
    const { success, warning } = useToast();
    const [tempApiKey, setTempApiKey] = useState(apiKey);
    const [showApiKey, setShowApiKey] = useState(false);

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
