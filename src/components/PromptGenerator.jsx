import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import ModelSelector from './ModelSelector';
import './PromptGenerator.css';

const PromptGenerator = () => {
    const { apiKey, stories, selectedModel, saveSelectedModel } = useApp();
    const { success, error: showError, warning } = useToast();

    const [activeTab, setActiveTab] = useState('video-prompts'); // video-prompts | history

    // Tab 1: Video Prompts
    const [selectedStoryId, setSelectedStoryId] = useState('');
    const [videoPrompts, setVideoPrompts] = useState('');
    const [isGeneratingPrompts, setIsGeneratingPrompts] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');

    // Tab 2: History
    const [promptHistory, setPromptHistory] = useState([]);
    const [historyFilter, setHistoryFilter] = useState('all'); // all | today | week | month

    // Load prompt history from localStorage
    useEffect(() => {
        const savedHistory = localStorage.getItem('veo-prompt-history');
        if (savedHistory) {
            try {
                setPromptHistory(JSON.parse(savedHistory));
            } catch (err) {
                console.error('Error loading history:', err);
            }
        }
    }, []);

    // Setup progress listener
    useEffect(() => {
        const unsubscribe = window.electronAPI.onProgressUpdate((data) => {
            setProgress(data.progress);
            setProgressStatus(data.status);
        });

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, []);

    // Filter history by date (only video-prompts are supported now)
    const getFilteredHistory = () => {
        let filtered = [...promptHistory].filter(item => item.type === 'video-prompts');

        // Filter by date
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (historyFilter === 'today') {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= today;
            });
        } else if (historyFilter === 'week') {
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= weekAgo;
            });
        } else if (historyFilter === 'month') {
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.timestamp);
                return itemDate >= monthAgo;
            });
        }

        return filtered;
    };

    // Parse video prompts into sections
    const parseVideoPrompts = (text) => {
        if (!text) return { settingChung: '', scenes: [] };

        const lines = text.split('\n');
        let settingChung = '';
        let scenes = [];
        let currentSection = '';
        let currentContent = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect SETTING CHUNG section
            if (line.includes('🧱 SETTING CHUNG') || line.includes('SETTING CHUNG')) {
                currentSection = 'setting';
                currentContent = [line];
            }
            // Detect Scene sections
            else if (line.match(/🎞️.*PROMPT.*Scene/i) || line.match(/PROMPT.*Scene/i)) {
                // Save previous section
                if (currentSection === 'setting' && currentContent.length > 0) {
                    settingChung = currentContent.join('\n');
                } else if (currentSection === 'scene' && currentContent.length > 0) {
                    scenes.push(currentContent.join('\n'));
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
            settingChung = currentContent.join('\n');
        } else if (currentSection === 'scene' && currentContent.length > 0) {
            scenes.push(currentContent.join('\n'));
        }

        return { settingChung, scenes };
    };

    // TAB 1: Generate structured video prompts
    const handleGenerateVideoPrompts = async () => {
        if (!selectedStoryId) {
            warning('Vui lòng chọn storyboard!');
            return;
        }

        if (!apiKey) {
            warning('Vui lòng nhập Gemini API Key trong Settings!');
            return;
        }

        // Convert selectedStoryId to number for comparison
        const selectedStory = stories.find(s => s.id === Number(selectedStoryId));
        if (!selectedStory) {
            showError('Không tìm thấy storyboard!');
            return;
        }

        setIsGeneratingPrompts(true);
        setVideoPrompts('');
        setProgress(0);
        setProgressStatus('Đang bắt đầu...');

        // Start simulated progress (smooth increments while waiting for AI)
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                // Slow down as we approach the expected real milestone
                if (prev < 30) return prev + 2;      // Fast start: 0-30%
                if (prev < 55) return prev + 1;      // Medium: 30-55%
                if (prev < 75) return prev + 0.5;    // Slow: 55-75%
                if (prev < 90) return prev + 0.2;    // Very slow: 75-90%
                return prev; // Stop at 90% and wait for real completion
            });
        }, 500); // Update every 500ms

        try {
            const result = await window.electronAPI.generateStructuredPrompts({
                storyboard: selectedStory,
                apiKey: apiKey,
                model: selectedModel
            });

            if (result.success) {
                setVideoPrompts(result.data);

                // Save to history
                const newHistoryItem = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    type: 'video-prompts',
                    storyId: selectedStory.id,
                    storyTitle: selectedStory.title || 'Untitled',
                    content: result.data
                };

                const updatedHistory = [newHistoryItem, ...promptHistory];
                setPromptHistory(updatedHistory);
                localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));

                success('Đã tạo prompt video thành công!');
            } else {
                showError(`Lỗi: ${result.error}`);
            }
        } catch (err) {
            console.error('Error generating prompts:', err);
            showError(`Lỗi: ${err.message}`);
            clearInterval(progressInterval); // Stop simulation on error
            setProgress(0);
            setProgressStatus('');
        } finally {
            clearInterval(progressInterval); // Stop simulation when done
            setIsGeneratingPrompts(false);

            // Ensure we reach 100% before clearing
            setProgress(100);
            setProgressStatus('Hoàn tất!');

            // Keep progress at 100% for 2 seconds before clearing
            setTimeout(() => {
                setProgress(0);
                setProgressStatus('');
            }, 2000);
        }
    };

    // Copy specific section to clipboard
    const handleCopySection = (content, sectionName) => {
        navigator.clipboard.writeText(content).then(() => {
            success(`Đã copy ${sectionName}!`);
        }).catch(err => {
            console.error('Error copying:', err);
            showError('Lỗi khi copy!');
        });
    };

    // Copy all prompts to clipboard
    const handleCopyAllPrompts = () => {
        if (!videoPrompts) {
            warning('Chưa có prompt nào để copy!');
            return;
        }

        navigator.clipboard.writeText(videoPrompts).then(() => {
            success('Đã copy toàn bộ prompt!');
        }).catch(err => {
            console.error('Error copying:', err);
            showError('Lỗi khi copy!');
        });
    };

    // Export prompts to file
    const handleExportPrompts = async () => {
        if (!videoPrompts) {
            warning('Chưa có prompt nào để xuất!');
            return;
        }

        try {
            const result = await window.electronAPI.showSaveDialog({
                title: 'Xuất Prompt Pack',
                defaultPath: `prompts_${Date.now()}.txt`,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePath) {
                await window.electronAPI.saveFile({
                    filePath: result.filePath,
                    content: videoPrompts
                });
                success('Đã xuất prompt thành công!');
            }
        } catch (err) {
            console.error('Error exporting prompts:', err);
            showError(`Lỗi: ${err.message}`);
        }
    };

    // TAB 2: Delete history item
    const handleDeleteHistoryItem = (id) => {
        const updatedHistory = promptHistory.filter(item => item.id !== id);
        setPromptHistory(updatedHistory);
        localStorage.setItem('veo-prompt-history', JSON.stringify(updatedHistory));
        success('Đã xóa khỏi lịch sử!');
    };

    // Load history item
    const handleLoadHistoryItem = (item) => {
        if (item.type === 'video-prompts') {
            setActiveTab('video-prompts');
            setVideoPrompts(item.content);
        }
        // Character image feature removed - will be implemented with Whisk AI later
    };

    return (
        <div className="prompt-generator">
            <div className="page-header">
                <h1>🎬 Tạo Prompt Video</h1>
                <p className="page-subtitle">Tạo prompt chi tiết và ảnh nhân vật từ storyboard</p>
            </div>

            {/* Tab Navigation */}
            <div className="tab-navigation">
                <button
                    className={`tab-btn ${activeTab === 'video-prompts' ? 'active' : ''}`}
                    onClick={() => setActiveTab('video-prompts')}
                >
                    📝 Tạo Prompt Video
                </button>
                <button
                    className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
                    onClick={() => setActiveTab('history')}
                >
                    📜 Lịch Sử ({promptHistory.length})
                </button>
            </div>

            {/* TAB 1: Video Prompts */}
            {activeTab === 'video-prompts' && (
                <div className="tab-content">
                    <div className="control-section">
                        {/* Model Selector */}
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={saveSelectedModel}
                        />

                        <div className="form-group">
                            <label>📚 Chọn Storyboard:</label>
                            <select
                                value={selectedStoryId}
                                onChange={(e) => setSelectedStoryId(e.target.value)}
                                className="story-select"
                                disabled={stories.length === 0}
                            >
                                <option value="">-- Chọn storyboard --</option>
                                {stories.map((story) => {
                                    // Format date
                                    const date = new Date(story.createdAt).toLocaleDateString('vi-VN', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    });

                                    // Get source info
                                    let sourceInfo = '';
                                    if (story.sourceType === 'idea') {
                                        sourceInfo = story.source.substring(0, 80);
                                    } else if (story.sourceType === 'url') {
                                        sourceInfo = story.source;
                                    } else {
                                        sourceInfo = story.source || 'Không rõ nguồn';
                                    }

                                    // Truncate if too long
                                    if (sourceInfo.length > 100) {
                                        sourceInfo = sourceInfo.substring(0, 100) + '...';
                                    }

                                    return (
                                        <option key={story.id} value={story.id}>
                                            [{date}] {sourceInfo} ({story.style || 'No style'})
                                        </option>
                                    );
                                })}
                            </select>
                            {stories.length === 0 && (
                                <p className="hint-text">💡 Chưa có storyboard nào. Hãy tạo story ở tab "Tạo Story" trước.</p>
                            )}
                            {selectedStoryId && (() => {
                                const story = stories.find(s => s.id === Number(selectedStoryId));
                                return story ? (
                                    <div className="story-preview">
                                        <p className="preview-label">📋 Preview:</p>
                                        <p className="preview-content">
                                            {story.content.substring(0, 200)}...
                                        </p>
                                    </div>
                                ) : null;
                            })()}
                        </div>

                        {/* Progress Bar */}
                        {isGeneratingPrompts && (
                            <div className="progress-container">
                                <div className="progress-bar-wrapper">
                                    <div className="progress-bar" style={{ width: `${progress}%` }}>
                                        <span className="progress-text">{progress}%</span>
                                    </div>
                                </div>
                                <div className="progress-status">{progressStatus}</div>
                            </div>
                        )}

                        <button
                            onClick={handleGenerateVideoPrompts}
                            disabled={isGeneratingPrompts || !selectedStoryId || !apiKey}
                            className="btn-primary"
                        >
                            {isGeneratingPrompts ? (
                                <>⏳ Đang tạo prompt...</>
                            ) : (
                                <>🎬 Tạo Prompt Video</>
                            )}
                        </button>
                    </div>

                    {videoPrompts && (() => {
                        const { settingChung, scenes } = parseVideoPrompts(videoPrompts);

                        return (
                            <div className="prompts-display">
                                <div className="prompts-actions">
                                    <button onClick={handleCopyAllPrompts} className="btn-secondary">
                                        📋 Copy Toàn Bộ
                                    </button>
                                    <button onClick={handleExportPrompts} className="btn-secondary">
                                        💾 Xuất File
                                    </button>
                                </div>

                                {/* SETTING CHUNG Section */}
                                {settingChung && (
                                    <div className="prompt-section">
                                        <div className="section-header">
                                            <h3 className="section-title">🧱 SETTING CHUNG</h3>
                                            <button
                                                onClick={() => handleCopySection(settingChung, 'Setting Chung')}
                                                className="btn-copy-section"
                                            >
                                                📋 Copy
                                            </button>
                                        </div>
                                        <div className="section-content">
                                            <pre>{settingChung}</pre>
                                        </div>
                                    </div>
                                )}

                                {/* Scene Sections */}
                                {scenes.map((scene, index) => (
                                    <div key={index} className="prompt-section scene-section">
                                        <div className="section-header">
                                            <h3 className="section-title">🎞️ Scene {index + 1}</h3>
                                            <button
                                                onClick={() => handleCopySection(settingChung + '\n\n---\n\n' + scene, `Scene ${index + 1} + Setting`)}
                                                className="btn-copy-section"
                                            >
                                                📋 Copy Scene + Setting
                                            </button>
                                        </div>
                                        <div className="section-content">
                                            <pre>{scene}</pre>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })()}
                </div>
            )}

            {/* TAB 2: History */}
            {activeTab === 'history' && (
                <div className="tab-content">
                    {/* History Filters */}
                    <div className="history-filters">
                        <div className="filter-group">
                            <label>📅 Thời gian:</label>
                            <div className="filter-buttons">
                                <button
                                    className={`filter-btn ${historyFilter === 'all' ? 'active' : ''}`}
                                    onClick={() => setHistoryFilter('all')}
                                >
                                    Tất cả
                                </button>
                                <button
                                    className={`filter-btn ${historyFilter === 'today' ? 'active' : ''}`}
                                    onClick={() => setHistoryFilter('today')}
                                >
                                    Hôm nay
                                </button>
                                <button
                                    className={`filter-btn ${historyFilter === 'week' ? 'active' : ''}`}
                                    onClick={() => setHistoryFilter('week')}
                                >
                                    7 ngày
                                </button>
                                <button
                                    className={`filter-btn ${historyFilter === 'month' ? 'active' : ''}`}
                                    onClick={() => setHistoryFilter('month')}
                                >
                                    30 ngày
                                </button>
                            </div>
                        </div>

                        {/* Type filter removed - only video-prompts supported now */}
                    </div>

                    <div className="history-section">
                        {(() => {
                            const filteredHistory = getFilteredHistory();

                            if (promptHistory.length === 0) {
                                return (
                                    <div className="empty-state">
                                        <p>📭 Chưa có lịch sử nào</p>
                                    </div>
                                );
                            }

                            if (filteredHistory.length === 0) {
                                return (
                                    <div className="empty-state">
                                        <p>🔍 Không tìm thấy lịch sử phù hợp với bộ lọc</p>
                                        <p className="hint-text">Thử thay đổi bộ lọc để xem thêm</p>
                                    </div>
                                );
                            }

                            return (
                                <div className="history-list">
                                    <div className="history-count">
                                        Hiển thị <strong>{filteredHistory.length}</strong> kết quả
                                    </div>
                                    {filteredHistory.map((item) => (
                                        <div key={item.id} className="history-item">
                                            <div className="history-header">
                                                <div className="history-meta">
                                                    <span className="history-type">
                                                        📝 Video Prompts
                                                    </span>
                                                    <span className="history-date">
                                                        {new Date(item.timestamp).toLocaleString('vi-VN')}
                                                    </span>
                                                </div>
                                                <div className="history-actions">
                                                    <button
                                                        onClick={() => handleLoadHistoryItem(item)}
                                                        className="btn-load"
                                                    >
                                                        📂 Tải
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteHistoryItem(item.id)}
                                                        className="btn-delete"
                                                    >
                                                        🗑️ Xóa
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="history-preview">
                                                <p><strong>Story:</strong> {item.storyTitle}</p>
                                                <p className="preview-text">{item.content.substring(0, 150)}...</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromptGenerator;
