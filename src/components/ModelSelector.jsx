import React, { useState } from 'react';
import { GEMINI_MODELS, DEFAULT_MODEL } from '../utils/constants';
import './ModelSelector.css';

const ModelSelector = ({ value, onChange, disabled = false }) => {
    const [showDetails, setShowDetails] = useState(false);

    const selectedModel = GEMINI_MODELS.find(m => m.id === value) || GEMINI_MODELS.find(m => m.id === DEFAULT_MODEL);

    // Group models by tier
    const groupedModels = {
        newest: GEMINI_MODELS.filter(m => m.tier === 'newest'),
        stable: GEMINI_MODELS.filter(m => m.tier === 'stable'),
        legacy: GEMINI_MODELS.filter(m => m.tier === 'legacy'),
        experimental: GEMINI_MODELS.filter(m => m.tier === 'experimental')
    };

    const getTierIcon = (tier) => {
        switch (tier) {
            case 'newest': return '🆕';
            case 'stable': return '✅';
            case 'legacy': return '📦';
            case 'experimental': return '⚠️';
            default: return '📄';
        }
    };

    const getTierLabel = (tier) => {
        switch (tier) {
            case 'newest': return 'Mới nhất (2.5)';
            case 'stable': return 'Ổn định (2.0)';
            case 'legacy': return 'Thế hệ cũ (1.5)';
            case 'experimental': return 'Thử nghiệm';
            default: return tier;
        }
    };

    return (
        <div className="model-selector">
            <div className="model-selector-header">
                <label>
                    <span className="label-icon">🤖</span>
                    <span className="label-text">Chọn AI Model</span>
                    <button
                        type="button"
                        className="info-button"
                        onClick={() => setShowDetails(!showDetails)}
                        title="Xem thông tin chi tiết"
                    >
                        {showDetails ? '📖 Ẩn' : 'ℹ️ Chi tiết'}
                    </button>
                </label>
            </div>

            <select
                className="model-select"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                {Object.entries(groupedModels).map(([tier, models]) => (
                    <optgroup key={tier} label={`${getTierIcon(tier)} ${getTierLabel(tier)}`}>
                        {models.map(model => (
                            <option key={model.id} value={model.id}>
                                {model.recommended && '⭐ '}
                                {model.name}
                                {model.free.rpd < 100 && ' ⚠️ Quota thấp'}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </select>

            {/* Selected Model Info */}
            <div className="model-quick-info">
                <div className="model-info-row">
                    <span className="info-label">Quota miễn phí/ngày:</span>
                    <span className={`info-value ${selectedModel.free.rpd < 100 ? 'quota-low' : 'quota-ok'}`}>
                        {selectedModel.free.rpd} requests
                    </span>
                </div>
                <div className="model-info-row">
                    <span className="info-label">Quota miễn phí/phút:</span>
                    <span className="info-value">{selectedModel.free.rpm} requests</span>
                </div>
            </div>

            {selectedModel.warning && (
                <div className="model-warning">
                    ⚠️ {selectedModel.warning}
                </div>
            )}

            {/* Detailed Info Panel */}
            {showDetails && (
                <div className="model-details-panel">
                    <div className="model-details-header">
                        <h3>{selectedModel.name}</h3>
                        {selectedModel.recommended && <span className="badge recommended">⭐ Khuyên dùng</span>}
                        <span className={`badge tier-${selectedModel.tier}`}>
                            {getTierIcon(selectedModel.tier)} {getTierLabel(selectedModel.tier)}
                        </span>
                    </div>

                    <p className="model-description">{selectedModel.description}</p>

                    <div className="model-stats">
                        <div className="stat-group">
                            <h4>📊 Quota Miễn phí (Free Tier)</h4>
                            <div className="stat-grid">
                                <div className="stat-item">
                                    <span className="stat-label">Requests/phút:</span>
                                    <span className="stat-value">{selectedModel.free.rpm}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Requests/ngày:</span>
                                    <span className={`stat-value ${selectedModel.free.rpd < 100 ? 'low' : 'ok'}`}>
                                        {selectedModel.free.rpd}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Tokens/phút:</span>
                                    <span className="stat-value">
                                        {(selectedModel.free.tpm / 1000000).toFixed(1)}M
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="stat-group">
                            <h4>💳 Quota Trả phí (Paid Tier)</h4>
                            <div className="stat-grid">
                                <div className="stat-item">
                                    <span className="stat-label">Requests/phút:</span>
                                    <span className="stat-value">{selectedModel.paid.rpm}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Requests/ngày:</span>
                                    <span className="stat-value">{selectedModel.paid.rpd}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Tokens/phút:</span>
                                    <span className="stat-value">
                                        {(selectedModel.paid.tpm / 1000000).toFixed(1)}M
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="model-features">
                        <h4>✨ Tính năng hỗ trợ</h4>
                        <div className="feature-tags">
                            {selectedModel.features.map(feature => (
                                <span key={feature} className="feature-tag">{feature}</span>
                            ))}
                        </div>
                    </div>

                    <div className="model-context">
                        <h4>📝 Context Window</h4>
                        <span className="context-value">{selectedModel.contextWindow}</span>
                    </div>

                    <div className="model-tips">
                        <h4>💡 Gợi ý sử dụng</h4>
                        <ul>
                            {selectedModel.tier === 'newest' && (
                                <>
                                    <li>✅ Model mới nhất, hiệu suất tốt nhất</li>
                                    <li>✅ Hỗ trợ thinking mode cho phân tích phức tạp</li>
                                    <li>✅ Quota 1500 requests/ngày - đủ cho cả ngày làm việc</li>
                                </>
                            )}
                            {selectedModel.tier === 'stable' && (
                                <>
                                    <li>✅ Ổn định, phù hợp production</li>
                                    <li>✅ Quota 1500 requests/ngày</li>
                                    <li>✅ Hỗ trợ đầy đủ tính năng</li>
                                </>
                            )}
                            {selectedModel.tier === 'legacy' && (
                                <>
                                    <li>📦 Thế hệ cũ hơn nhưng đã được kiểm chứng</li>
                                    <li>✅ Quota {selectedModel.free.rpd} requests/ngày</li>
                                    {selectedModel.id === 'gemini-1.5-pro' && (
                                        <li>⚠️ Quota thấp (50/ngày) nhưng mạnh mẽ cho tác vụ phức tạp</li>
                                    )}
                                </>
                            )}
                            {selectedModel.tier === 'experimental' && (
                                <>
                                    <li>⚠️ KHÔNG ổn định, có thể thay đổi bất cứ lúc nào</li>
                                    <li>❌ Quota RẤT THẤP: chỉ {selectedModel.free.rpd} requests/ngày</li>
                                    <li>❌ KHÔNG dùng cho production</li>
                                    <li>✅ Chỉ dùng để test tính năng mới</li>
                                </>
                            )}
                        </ul>
                    </div>

                    <div className="model-links">
                        <a
                            href="https://aistudio.google.com/usage?timeRange=last-28-days&tab=rate-limit"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-button"
                        >
                            📊 Xem Quota còn lại
                        </a>
                        <a
                            href="https://ai.google.dev/gemini-api/docs/models"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-button"
                        >
                            📚 Tài liệu Model
                        </a>
                        <a
                            href="https://ai.google.dev/pricing"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link-button"
                        >
                            💰 Bảng giá
                        </a>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSelector;
