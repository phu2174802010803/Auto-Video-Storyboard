import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import './VideoGenerator.css';

const VideoGenerator = () => {
    const { stories } = useApp();
    const { success, error: showError, warning } = useToast();

    const [activeTab, setActiveTab] = useState('create'); // create | history

    // Tab 1: Create Videos
    const [veo3Accounts, setVeo3Accounts] = useState(() => {
        const saved = localStorage.getItem('veo3-accounts');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedPromptId, setSelectedPromptId] = useState(''); // Changed from selectedStoryId
    const [promptHistory, setPromptHistory] = useState([]); // Load from veo-prompt-history
    const [prompts, setPrompts] = useState([]);
    const [autoSave, setAutoSave] = useState(false);
    const [savePath, setSavePath] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [overallProgress, setOverallProgress] = useState({ current: 0, total: 0 });
    const [videoProgress, setVideoProgress] = useState({});
    const [logs, setLogs] = useState([]);

    // Tab 2: History
    const [videoHistory, setVideoHistory] = useState([]);

    // Load prompt history from localStorage (from PromptGenerator)
    useEffect(() => {
        const savedPromptHistory = localStorage.getItem('veo-prompt-history');
        if (savedPromptHistory) {
            try {
                const history = JSON.parse(savedPromptHistory);
                // Filter only video-prompts type
                const videoPrompts = history.filter(item => item.type === 'video-prompts');
                setPromptHistory(videoPrompts);
            } catch (err) {
                console.error('Error loading prompt history:', err);
            }
        }
    }, []);

    // Load video history from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem('veo3-video-history');
        if (savedHistory) {
            try {
                setVideoHistory(JSON.parse(savedHistory));
            } catch (err) {
                console.error('Error loading video history:', err);
            }
        }
    }, []);

    // Load veo3 accounts when component mounts
    useEffect(() => {
        const saved = localStorage.getItem('veo3-accounts');
        if (saved) {
            try {
                setVeo3Accounts(JSON.parse(saved));
            } catch (err) {
                console.error('Error loading accounts:', err);
            }
        }
    }, []);

    // Parse prompts from prompt history content
    // Each scene will include SETTING CHUNG + Scene content
    const parsePromptsFromContent = (content) => {
        if (!content) return [];

        const lines = content.split('\n');
        const prompts = [];
        let settingChung = ''; // Store SETTING CHUNG to prepend to each scene
        let currentSection = '';
        let currentContent = [];
        let sceneIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect SETTING CHUNG section
            if (line.includes('🧱 SETTING CHUNG') || line.includes('SETTING CHUNG')) {
                // Save previous scene
                if (currentSection === 'scene' && currentContent.length > 0) {
                    sceneIndex++;
                    const sceneContent = currentContent.join('\n').trim();
                    // Combine SETTING CHUNG + Scene
                    const fullPrompt = settingChung
                        ? `${settingChung}\n\n---\n\n${sceneContent}`
                        : sceneContent;

                    prompts.push({
                        id: `scene-${sceneIndex}`,
                        type: 'scene',
                        title: `Scene ${sceneIndex}`,
                        text: fullPrompt,
                        sceneOnly: sceneContent, // Keep scene-only text for display
                        originalIndex: sceneIndex
                    });
                }

                currentSection = 'setting';
                currentContent = [line];
            }
            // Detect Scene sections
            else if (line.match(/🎞️.*PROMPT.*Scene/i) || line.match(/PROMPT.*Scene/i)) {
                // Save SETTING CHUNG if we were in that section
                if (currentSection === 'setting' && currentContent.length > 0) {
                    settingChung = currentContent.join('\n').trim();
                }
                // Save previous scene
                else if (currentSection === 'scene' && currentContent.length > 0) {
                    sceneIndex++;
                    const sceneContent = currentContent.join('\n').trim();
                    const fullPrompt = settingChung
                        ? `${settingChung}\n\n---\n\n${sceneContent}`
                        : sceneContent;

                    prompts.push({
                        id: `scene-${sceneIndex}`,
                        type: 'scene',
                        title: `Scene ${sceneIndex}`,
                        text: fullPrompt,
                        sceneOnly: sceneContent,
                        originalIndex: sceneIndex
                    });
                }

                currentSection = 'scene';
                currentContent = [line];
            }
            // Continue current section
            else if (currentSection) {
                currentContent.push(line);
            }
        }

        // Save last section
        if (currentSection === 'setting' && currentContent.length > 0) {
            settingChung = currentContent.join('\n').trim();
        } else if (currentSection === 'scene' && currentContent.length > 0) {
            sceneIndex++;
            const sceneContent = currentContent.join('\n').trim();
            const fullPrompt = settingChung
                ? `${settingChung}\n\n---\n\n${sceneContent}`
                : sceneContent;

            prompts.push({
                id: `scene-${sceneIndex}`,
                type: 'scene',
                title: `Scene ${sceneIndex}`,
                text: fullPrompt,
                sceneOnly: sceneContent,
                originalIndex: sceneIndex
            });
        }

        console.log('[VideoGenerator] Parsed prompts with SETTING:', prompts);
        return prompts;
    };

    // Handle prompt selection
    const handlePromptChange = (promptId) => {
        console.log('[VideoGenerator] Prompt selected:', promptId);
        setSelectedPromptId(promptId);
        if (promptId) {
            const promptItem = promptHistory.find(p => p.id === Number(promptId));
            console.log('[VideoGenerator] Found prompt item:', promptItem);
            if (promptItem) {
                console.log('[VideoGenerator] Prompt content length:', promptItem.content?.length);
                const parsedPrompts = parsePromptsFromContent(promptItem.content);
                console.log('[VideoGenerator] Parsed prompts count:', parsedPrompts.length);
                setPrompts(parsedPrompts);
            }
        } else {
            setPrompts([]);
        }
    };

    // Handle folder selection
    const handleSelectFolder = async () => {
        try {
            const result = await window.electronAPI.selectDownloadDirectory();
            if (result && result.success && result.path) {
                setSavePath(result.path);
                success('Đã chọn thư mục lưu video!');
            }
        } catch (error) {
            console.error('Error selecting folder:', error);
            showError('Lỗi khi chọn thư mục!');
        }
    };

    // Setup Veo3 log listener
    useEffect(() => {
        const unsubscribe = window.electronAPI.onVeo3Log((logData) => {
            const timestamp = new Date().toLocaleTimeString('vi-VN');
            const newLog = {
                timestamp,
                promptId: logData.promptId,
                message: logData.message,
                status: logData.status,
                videoUrl: logData.videoUrl
            };

            setLogs(prev => [...prev, newLog]);

            // Update video progress
            if (logData.promptId) {
                setVideoProgress(prev => ({
                    ...prev,
                    [logData.promptId]: {
                        status: logData.status,
                        videoUrl: logData.videoUrl
                    }
                }));
            }

            // Update overall progress
            if (logData.status === 'success') {
                setOverallProgress(prev => ({
                    ...prev,
                    current: prev.current + 1
                }));
            }
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // Start video generation
    const handleStart = async () => {
        if (!selectedAccountId) {
            warning('Vui lòng chọn tài khoản Veo3!');
            return;
        }

        if (prompts.length === 0) {
            warning('Vui lòng chọn storyboard!');
            return;
        }

        if (autoSave && !savePath) {
            warning('Vui lòng chọn thư mục lưu video!');
            return;
        }

        const selectedAccount = veo3Accounts.find(acc => acc.id.toString() === selectedAccountId);
        if (!selectedAccount) {
            showError('Không tìm thấy tài khoản!');
            return;
        }

        // Filter out setting prompts (only create videos for scenes)
        const videoPrompts = prompts.filter(p => p.type === 'scene');

        if (videoPrompts.length === 0) {
            warning('Không có scene nào để tạo video!');
            return;
        }

        setIsRunning(true);
        setLogs([]);
        setVideoProgress({});
        setOverallProgress({ current: 0, total: videoPrompts.length });

        try {
            const result = await window.electronAPI.startVeo3Automation({
                prompts: videoPrompts,
                cookieString: selectedAccount.cookie,
                autoSaveConfig: {
                    enabled: autoSave,
                    path: savePath
                }
            });

            if (result.success) {
                success(`Hoàn thành! Đã xử lý ${result.processed}/${result.total} video`);

                // Get prompt info for history
                const promptItem = promptHistory.find(p => p.id === Number(selectedPromptId));

                // Save to history
                const historyItem = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    promptId: Number(selectedPromptId),
                    storyId: promptItem?.storyId,
                    storyTitle: promptItem?.storyTitle || 'Unknown',
                    accountName: selectedAccount.name,
                    totalVideos: result.total,
                    successCount: result.processed,
                    logs: logs
                };

                const updatedHistory = [historyItem, ...videoHistory];
                setVideoHistory(updatedHistory);
                localStorage.setItem('veo3-video-history', JSON.stringify(updatedHistory));
            } else {
                showError(`Lỗi: ${result.error}`);
            }
        } catch (err) {
            showError(`Lỗi: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    // Stop video generation
    const handleStop = () => {
        window.electronAPI.stopVeo3Automation();
        setIsRunning(false);
        warning('Đã dừng quá trình tạo video!');
    };

    // Clear logs
    const handleClearLogs = () => {
        setLogs([]);
        setVideoProgress({});
        setOverallProgress({ current: 0, total: 0 });
    };

    // Delete history item
    const handleDeleteHistory = (id) => {
        if (confirm('Bạn có chắc muốn xóa lịch sử này?')) {
            const updated = videoHistory.filter(h => h.id !== id);
            setVideoHistory(updated);
            localStorage.setItem('veo3-video-history', JSON.stringify(updated));
            success('Đã xóa lịch sử!');
        }
    };

    // Get log status class
    const getLogStatusClass = (status) => {
        switch (status) {
            case 'success': return 'log-success';
            case 'error': return 'log-error';
            case 'processing': return 'log-processing';
            case 'running': return 'log-running';
            default: return '';
        }
    };

    return (
        <div className="video-generator">
            <div className="page-header">
                <h1>🎥 Tạo Video Veo 3</h1>
                <p className="page-subtitle">Tự động tạo video từ prompts sử dụng Google Veo 3</p>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                    onClick={() => setActiveTab('create')}
                >
                    🎬 Tạo Video
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📜 Lịch Sử ({videoHistory.length})
                </button>
            </div>

            {/* TAB 1: Create Videos */}
            {activeTab === 'create' && (
                <div className="tab-content">
                    <div className="control-section">
                        {/* Account Selection */}
                        <div className="form-group">
                            <label>👤 Chọn Tài Khoản Veo3:</label>
                            <select
                                value={selectedAccountId}
                                onChange={(e) => setSelectedAccountId(e.target.value)}
                                className="account-select"
                                disabled={veo3Accounts.length === 0}
                            >
                                <option value="">-- Chọn tài khoản --</option>
                                {veo3Accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.name}
                                    </option>
                                ))}
                            </select>
                            {veo3Accounts.length === 0 && (
                                <p className="hint-text">
                                    💡 Chưa có tài khoản nào. Hãy thêm tài khoản ở tab <strong>Cài đặt</strong>.
                                </p>
                            )}
                        </div>

                        {/* Prompt Selection */}
                        <div className="form-group">
                            <label>� Chọn Prompt đã tạo:</label>
                            <select
                                value={selectedPromptId}
                                onChange={(e) => handlePromptChange(e.target.value)}
                                className="story-select"
                                disabled={promptHistory.length === 0}
                            >
                                <option value="">-- Chọn prompt để tạo video --</option>
                                {promptHistory.map((promptItem) => {
                                    const date = new Date(promptItem.timestamp).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });

                                    // Get story info
                                    const story = stories.find(s => s.id === promptItem.storyId);
                                    let storyInfo = promptItem.storyTitle || 'Unknown';
                                    if (story && story.source) {
                                        storyInfo = story.source.substring(0, 60);
                                    }
                                    if (storyInfo.length > 60) {
                                        storyInfo = storyInfo.substring(0, 60) + '...';
                                    }

                                    return (
                                        <option key={promptItem.id} value={promptItem.id}>
                                            [{date}] {storyInfo}
                                        </option>
                                    );
                                })}
                            </select>
                            {promptHistory.length === 0 && (
                                <p className="hint-text">
                                    💡 Chưa có prompt nào. Hãy tạo prompt ở tab <strong>"Tạo Prompt Video"</strong> trước.
                                </p>
                            )}
                            {prompts.length > 0 && (
                                <div className="prompts-preview success">
                                    <p className="preview-label">
                                        ✅ Đã tải <strong>{prompts.length}</strong> prompts
                                        (Sẽ tạo <strong>{prompts.filter(p => p.type === 'scene').length}</strong> video)
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Auto-save Settings */}
                        <div className="form-group">
                            <label className="toggle-label">
                                <input
                                    type="checkbox"
                                    checked={autoSave}
                                    onChange={(e) => setAutoSave(e.target.checked)}
                                    disabled={isRunning}
                                />
                                <span>💾 Tự động lưu video sau khi tạo</span>
                            </label>
                            {autoSave && (
                                <div className="save-path-group">
                                    <button
                                        onClick={handleSelectFolder}
                                        className="btn-secondary"
                                        disabled={isRunning}
                                    >
                                        📁 Chọn Thư Mục
                                    </button>
                                    {savePath && (
                                        <span className="save-path-display">
                                            Lưu tại: {savePath}
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="action-buttons">
                            {!isRunning ? (
                                <button
                                    onClick={handleStart}
                                    disabled={!selectedAccountId || prompts.length === 0}
                                    className="btn-primary"
                                >
                                    🚀 Bắt Đầu Tạo Video
                                </button>
                            ) : (
                                <button
                                    onClick={handleStop}
                                    className="btn-danger"
                                >
                                    🛑 Dừng Lại
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Results Section */}
                    {prompts.length > 0 && (
                        <div className="results-section">
                            <div className="section-header-bar">
                                <h2>📊 Danh Sách Prompts</h2>
                                <span className="prompts-count">
                                    {prompts.filter(p => p.type === 'scene').length} scenes sẵn sàng
                                </span>
                            </div>

                            {/* Prompt Cards Grid - Only scenes, each includes SETTING CHUNG */}
                            <div className="prompt-cards-grid">
                                {prompts.filter(p => p.type === 'scene').map((prompt, index) => {
                                    const progress = videoProgress[prompt.id];
                                    const statusClass = progress?.status || 'ready';

                                    return (
                                        <div key={prompt.id} className={`prompt-card scene ${statusClass}`}>
                                            <div className="prompt-card-header">
                                                <div className="prompt-card-title-row">
                                                    <input
                                                        type="checkbox"
                                                        checked={true}
                                                        onChange={() => { }} // Add empty handler to fix warning
                                                        disabled={isRunning}
                                                        className="prompt-checkbox"
                                                        readOnly
                                                    />
                                                    <h4 className="prompt-card-title">
                                                        🎞️ Scene {prompt.originalIndex}
                                                    </h4>
                                                </div>
                                                <div className="prompt-card-actions">
                                                    <span className="ready-badge">
                                                        🧱 + Scene
                                                    </span>
                                                    {statusClass !== 'ready' && (
                                                        <span className={`status-badge badge-${statusClass}`}>
                                                            {statusClass === 'waiting' && '⏳'}
                                                            {statusClass === 'processing' && '⚙️'}
                                                            {statusClass === 'success' && '✅'}
                                                            {statusClass === 'error' && '❌'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="prompt-card-body">
                                                <div className="prompt-preview-box">
                                                    <p className="preview-label">Kết quả sẽ hiển thị ở đây</p>
                                                </div>
                                                <div className="prompt-text-content">
                                                    {/* Display scene-only text in card, but full text will be sent to Veo3 */}
                                                    <p className="prompt-text">{prompt.sceneOnly || prompt.text}</p>
                                                    <div className="prompt-info-badge">
                                                        💡 Prompt này bao gồm SETTING CHUNG + Scene
                                                    </div>
                                                </div>
                                            </div>

                                            {progress?.videoUrl && (
                                                <div className="prompt-card-footer">
                                                    <button
                                                        onClick={() => window.open(progress.videoUrl, '_blank')}
                                                        className="btn-view-video"
                                                    >
                                                        👁️ Xem Video
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(progress.videoUrl);
                                                            success('Đã copy URL!');
                                                        }}
                                                        className="btn-copy-url"
                                                    >
                                                        📋 Copy URL
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Overall Progress - only show when running */}
                            {isRunning && overallProgress.total > 0 && (
                                <div className="overall-progress">
                                    <div className="progress-header">
                                        <span>Tổng tiến trình</span>
                                        <span className="progress-text">
                                            {overallProgress.current}/{overallProgress.total} video ({Math.round((overallProgress.current / overallProgress.total) * 100)}%)
                                        </span>
                                    </div>
                                    <div className="progress-bar-wrapper">
                                        <div
                                            className="progress-bar"
                                            style={{ width: `${(overallProgress.current / overallProgress.total) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Logs */}
                            {logs.length > 0 && (
                                <div className="logs-section">
                                    <h3 className="logs-title">📝 Chi Tiết Logs</h3>
                                    <div className="logs-container">
                                        {logs.map((log, index) => (
                                            <div key={index} className={`log-item ${getLogStatusClass(log.status)}`}>
                                                <span className="log-time">{log.timestamp}</span>
                                                {log.promptId && (
                                                    <span className="log-prompt-id">[{log.promptId}]</span>
                                                )}
                                                <span className="log-message">{log.message}</span>
                                                {log.videoUrl && (
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(log.videoUrl);
                                                            success('Đã copy URL!');
                                                        }}
                                                        className="btn-copy-url"
                                                    >
                                                        📋 Copy URL
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: History */}
            {activeTab === 'history' && (
                <div className="tab-content">
                    <div className="history-header">
                        <h2>📜 Lịch Sử Tạo Video</h2>
                        <p className="history-subtitle">Xem lại các lần tạo video trước đây</p>
                    </div>

                    {videoHistory.length === 0 ? (
                        <div className="empty-state">
                            <span className="empty-icon">📹</span>
                            <p>Chưa có lịch sử tạo video</p>
                            <p className="hint-text">Tạo video ở tab "Tạo Video" để xem lịch sử</p>
                        </div>
                    ) : (
                        <div className="history-list">
                            {videoHistory.map((item) => {
                                const date = new Date(item.timestamp);
                                const story = stories.find(s => s.id === item.storyId);
                                const displayTitle = item.storyTitle || story?.source?.substring(0, 80) || 'Prompt đã xóa';

                                return (
                                    <div key={item.id} className="history-item">
                                        <div className="history-item-header">
                                            <div className="history-item-info">
                                                <h3 className="history-item-title">
                                                    🎬 {displayTitle}
                                                </h3>
                                                <p className="history-item-meta">
                                                    <span>👤 {item.accountName}</span>
                                                    <span>•</span>
                                                    <span>📅 {date.toLocaleString('vi-VN')}</span>
                                                    <span>•</span>
                                                    <span>✅ {item.successCount}/{item.totalVideos} video</span>
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteHistory(item.id)}
                                                className="btn-delete-history"
                                            >
                                                🗑️
                                            </button>
                                        </div>
                                        <div className="history-item-stats">
                                            <div className="stat-badge success">
                                                ✅ Thành công: {item.successCount}
                                            </div>
                                            <div className="stat-badge error">
                                                ❌ Thất bại: {item.totalVideos - item.successCount}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default VideoGenerator;
