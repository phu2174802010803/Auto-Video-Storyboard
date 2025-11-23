import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import { STORY_STYLES, VIDEO_DURATION_PRESETS } from '../utils/constants';
import ModelSelector from './ModelSelector';
import './StoryCreator.css';

const StoryCreator = () => {
    const { apiKey, selectedModel, saveSelectedModel, addStory } = useApp();
    const { success, error, warning } = useToast();

    // Load from localStorage on mount
    const loadFromStorage = (key, defaultValue) => {
        try {
            const saved = localStorage.getItem(`storyboard-${key}`);
            return saved !== null ? JSON.parse(saved) : defaultValue;
        } catch {
            return defaultValue;
        }
    };

    const [mode, setMode] = useState(() => loadFromStorage('mode', 'idea'));
    const [idea, setIdea] = useState(() => loadFromStorage('idea', ''));
    const [url, setUrl] = useState(() => loadFromStorage('url', ''));
    const [uploadedFile, setUploadedFile] = useState(null);
    const [fileContent, setFileContent] = useState(() => loadFromStorage('fileContent', ''));
    const [fileName, setFileName] = useState(() => loadFromStorage('fileName', ''));
    const [contentSummary, setContentSummary] = useState(() => loadFromStorage('contentSummary', ''));
    const [summarizing, setSummarizing] = useState(false);
    const [urlIdea, setUrlIdea] = useState(() => loadFromStorage('urlIdea', ''));
    const [showSummary, setShowSummary] = useState(() => loadFromStorage('showSummary', true));
    const [showAnalysisModal, setShowAnalysisModal] = useState(false);
    const [duration, setDuration] = useState(() => loadFromStorage('duration', '1000'));
    const [customDuration, setCustomDuration] = useState(() => loadFromStorage('customDuration', ''));
    const [style, setStyle] = useState(() => loadFromStorage('style', '� Hoạt hình Pixar 3D (Mặc định)'));
    const [customStyle, setCustomStyle] = useState(() => loadFromStorage('customStyle', ''));

    // Advanced options
    const [addBridgeScenes, setAddBridgeScenes] = useState(() => loadFromStorage('addBridgeScenes', true));
    const [hideFormulas, setHideFormulas] = useState(() => loadFromStorage('hideFormulas', true));
    const [ensureContinuity, setEnsureContinuity] = useState(() => loadFromStorage('ensureContinuity', true));
    const [customInstructions, setCustomInstructions] = useState(() => loadFromStorage('customInstructions', ''));

    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [progressStatus, setProgressStatus] = useState('');
    const [generatedStory, setGeneratedStory] = useState(() => loadFromStorage('generatedStory', ''));
    const [isEditingStory, setIsEditingStory] = useState(false);
    const [editedStory, setEditedStory] = useState('');

    // Calculate word count from duration
    const getWordCountFromDuration = (dur) => {
        const preset = VIDEO_DURATION_PRESETS.find(p => p.value === dur);
        return preset ? preset.words : parseInt(dur); // Direct word count for custom
    };

    // Get duration in minutes and seconds for display
    const getDurationDisplay = (wordCount) => {
        const minutes = Math.round(wordCount / 200); // ~200 words per minute for Vietnamese
        const seconds = (minutes % 1) * 60;
        if (minutes >= 1) {
            return `~${Math.floor(minutes)}m ${Math.round(seconds)}s`;
        }
        return `~${Math.round(wordCount / 200 * 60)}s`;
    };

    const finalDuration = duration === 'custom' ? customDuration : duration;
    const finalWordCount = duration === 'custom'
        ? parseInt(customDuration) || 1000
        : getWordCountFromDuration(duration);
    const finalStyle = style === '✨ Tùy chỉnh' ? customStyle : style;
    const durationDisplay = getDurationDisplay(finalWordCount);

    // Save to localStorage whenever state changes
    useEffect(() => {
        localStorage.setItem('storyboard-mode', JSON.stringify(mode));
    }, [mode]);

    useEffect(() => {
        localStorage.setItem('storyboard-idea', JSON.stringify(idea));
    }, [idea]);

    useEffect(() => {
        localStorage.setItem('storyboard-url', JSON.stringify(url));
    }, [url]);

    useEffect(() => {
        localStorage.setItem('storyboard-duration', JSON.stringify(duration));
    }, [duration]);

    useEffect(() => {
        localStorage.setItem('storyboard-customDuration', JSON.stringify(customDuration));
    }, [customDuration]);

    useEffect(() => {
        localStorage.setItem('storyboard-style', JSON.stringify(style));
    }, [style]);

    useEffect(() => {
        localStorage.setItem('storyboard-customStyle', JSON.stringify(customStyle));
    }, [customStyle]);

    useEffect(() => {
        localStorage.setItem('storyboard-addBridgeScenes', JSON.stringify(addBridgeScenes));
    }, [addBridgeScenes]);

    useEffect(() => {
        localStorage.setItem('storyboard-hideFormulas', JSON.stringify(hideFormulas));
    }, [hideFormulas]);

    useEffect(() => {
        localStorage.setItem('storyboard-ensureContinuity', JSON.stringify(ensureContinuity));
    }, [ensureContinuity]);

    useEffect(() => {
        localStorage.setItem('storyboard-customInstructions', JSON.stringify(customInstructions));
    }, [customInstructions]);

    useEffect(() => {
        localStorage.setItem('storyboard-generatedStory', JSON.stringify(generatedStory));
    }, [generatedStory]);

    useEffect(() => {
        localStorage.setItem('storyboard-fileContent', JSON.stringify(fileContent));
    }, [fileContent]);

    useEffect(() => {
        localStorage.setItem('storyboard-fileName', JSON.stringify(fileName));
    }, [fileName]);

    useEffect(() => {
        localStorage.setItem('storyboard-contentSummary', JSON.stringify(contentSummary));
    }, [contentSummary]);

    useEffect(() => {
        localStorage.setItem('storyboard-urlIdea', JSON.stringify(urlIdea));
    }, [urlIdea]);

    useEffect(() => {
        localStorage.setItem('storyboard-showSummary', JSON.stringify(showSummary));
    }, [showSummary]);

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

    // Truncate filename for display
    const truncateFilename = (filename, maxLength = 30) => {
        if (!filename || filename.length <= maxLength) return filename;

        const ext = filename.substring(filename.lastIndexOf('.'));
        const nameWithoutExt = filename.substring(0, filename.lastIndexOf('.'));
        const maxNameLength = maxLength - ext.length - 3; // 3 for "..."

        if (nameWithoutExt.length <= maxNameLength) return filename;

        const keepStart = Math.ceil(maxNameLength * 0.6);
        const keepEnd = Math.floor(maxNameLength * 0.4);

        return nameWithoutExt.substring(0, keepStart) + '...' + nameWithoutExt.substring(nameWithoutExt.length - keepEnd) + ext;
    };

    const generateSummary = async (content, source) => {
        if (!apiKey) {
            error('Vui lòng cài đặt API Key trước');
            return;
        }

        setSummarizing(true);

        try {
            const result = await window.electronAPI.generateContentSummary({
                content,
                source,
                apiKey,
                model: selectedModel // Pass selected model
            });

            if (result.success) {
                setContentSummary(result.summary);
                success('✅ Đã phân tích nội dung chi tiết!');
            } else {
                error(`Lỗi: ${result.error}`);
            }
        } catch (err) {
            error(`Có lỗi xảy ra: ${err.message}`);
        } finally {
            setSummarizing(false);
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const allowedTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
            'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
            'application/msword', // doc
            'text/plain'
        ];

        if (!allowedTypes.includes(file.type)) {
            error('Chỉ hỗ trợ file PDF, DOCX, PPTX, DOC, TXT');
            return;
        }

        setUploadedFile(file);
        setFileName(file.name);

        try {
            // Call Electron API to read file content
            const result = await window.electronAPI.readFileContent(file.path);

            if (result.success) {
                setFileContent(result.content);
                success(`Đã đọc file: ${file.name}`);

                // Auto generate summary
                await generateSummary(result.content, `file ${file.name}`);
            } else {
                error(`Lỗi đọc file: ${result.error}`);
            }
        } catch (err) {
            error(`Có lỗi xảy ra: ${err.message}`);
        }
    };

    const handleUrlBlur = async () => {
        if (url.trim() && !fileContent && apiKey) {
            // Auto generate summary when user finishes typing URL
            setSummarizing(true);
            try {
                const https = require('https');
                // Just generate summary, don't fetch full content yet
                await generateSummary(url, `URL ${url}`);
            } catch (err) {
                console.log('Error generating URL summary:', err);
            }
        }
    };

    const validateInputs = () => {
        if (!apiKey) {
            error('Vui lòng cài đặt API Key trong phần Cài đặt');
            return false;
        }

        if (mode === 'idea' && !idea.trim()) {
            warning('Vui lòng nhập ý tưởng storyboard');
            return false;
        }

        if (mode === 'url' && !url.trim() && !fileContent) {
            warning('Vui lòng nhập URL bài viết hoặc upload file');
            return false;
        }

        if (duration === 'custom' && (!customDuration || parseInt(customDuration) < 500)) {
            warning('Vui lòng nhập số từ tùy chỉnh (tối thiểu 500 từ)');
            return false;
        }

        if (style === '✨ Tùy chỉnh' && !customStyle.trim()) {
            warning('Vui lòng nhập phong cách hình ảnh tùy chỉnh');
            return false;
        }

        return true;
    };

    const handleGenerate = async () => {
        if (!validateInputs()) return;

        setLoading(true);
        setGeneratedStory('');
        setProgress(0);
        setProgressStatus('Đang bắt đầu...');

        // Start simulated progress (smooth increments while waiting for AI)
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                // Slow down as we approach the expected real milestone
                if (prev < 25) return prev + 2;      // Fast start: 0-25%
                if (prev < 50) return prev + 1;      // Medium: 25-50%
                if (prev < 70) return prev + 0.5;    // Slow: 50-70%
                if (prev < 85) return prev + 0.2;    // Very slow: 70-85%
                return prev; // Stop at 85% and wait for real completion
            });
        }, 500); // Update every 500ms

        try {
            let result;

            if (mode === 'idea') {
                result = await window.electronAPI.generateStoryFromIdea({
                    idea,
                    duration: finalDuration,
                    wordCount: finalWordCount,
                    style: finalStyle,
                    apiKey,
                    model: selectedModel, // Pass selected model
                    addBridgeScenes,
                    hideFormulas,
                    ensureContinuity,
                    customInstructions
                });
            } else {
                // Use file content if available, otherwise use URL
                const content = fileContent || url;
                const sourceType = fileContent ? 'file' : 'url';

                result = await window.electronAPI.generateStoryFromUrl({
                    url: content,
                    sourceType,
                    fileName: fileName || '',
                    urlIdea: urlIdea || '', // Additional idea for URL/File mode
                    duration: finalDuration,
                    wordCount: finalWordCount,
                    style: finalStyle,
                    apiKey,
                    model: selectedModel, // Pass selected model
                    addBridgeScenes,
                    hideFormulas,
                    ensureContinuity,
                    customInstructions
                });
            }

            if (result.success) {
                setGeneratedStory(result.story);

                // Save to history
                const newStory = {
                    id: Date.now(),
                    idea: mode === 'idea' ? idea : (fileName || url),
                    story: result.story,
                    style,
                    mode,
                    timestamp: new Date().toISOString()
                };

                const existingStories = JSON.parse(localStorage.getItem('veo-suite-stories') || '[]');
                localStorage.setItem('veo-suite-stories', JSON.stringify([newStory, ...existingStories]));

                alert('✅ Tạo storyboard thành công!');
            } else {
                alert('❌ Lỗi: ' + result.error);
            }
        } catch (err) {
            error(`Có lỗi xảy ra: ${err.message}`);
            clearInterval(progressInterval); // Stop simulation on error
            setProgress(0);
            setProgressStatus('');
        } finally {
            clearInterval(progressInterval); // Stop simulation when done
            setLoading(false);

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

    const handleSave = () => {
        if (!generatedStory) {
            warning('Không có storyboard để lưu');
            return;
        }

        const story = {
            id: Date.now(),
            content: generatedStory,
            source: mode === 'idea' ? idea : (fileName || url),
            sourceType: mode,
            style: finalStyle,
            wordCount: finalWordCount,
            createdAt: new Date().toISOString()
        };

        addStory(story);

        success('Đã lưu storyboard!');
        handleReset();
    };

    const handleReset = () => {
        // Không xóa dữ liệu khi chuyển tab
        // User có thể tự xóa nếu muốn
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        success('Đã sao chép!');
    };

    // Story editing functions
    const handleStartEditStory = () => {
        setEditedStory(generatedStory);
        setIsEditingStory(true);
    };

    const handleSaveEditedStory = () => {
        setGeneratedStory(editedStory);
        setIsEditingStory(false);
        success('Đã lưu storyboard đã chỉnh sửa!');
    };

    const handleCancelEditStory = () => {
        setEditedStory('');
        setIsEditingStory(false);
    };

    return (
        <div className="story-creator">
            <div className="story-creator-header">
                <h2>🎬 Tạo Storyboard Video bằng AI</h2>
            </div>

            {/* Model Selector */}
            <ModelSelector
                value={selectedModel}
                onChange={saveSelectedModel}
                disabled={loading}
            />

            <div className="creator-grid">
                {/* Input Section */}
                <div className="input-section">
                    <div className="mode-tabs">
                        <button
                            className={`tab ${mode === 'idea' ? 'active' : ''}`}
                            onClick={() => setMode('idea')}
                        >
                            🎬 Từ Ý tưởng
                        </button>
                        <button
                            className={`tab ${mode === 'url' ? 'active' : ''}`}
                            onClick={() => setMode('url')}
                        >
                            🔗 Từ URL / File
                        </button>
                    </div>

                    {mode === 'idea' ? (
                        <div className="input-group">
                            <label>Ý tưởng Storyboard</label>
                            <textarea
                                value={idea}
                                onChange={(e) => setIdea(e.target.value)}
                                placeholder="Ví dụ: 2 học sinh cắt hình thoi thành hình chữ nhật, Thầy giáo giải thích định lý Pythagore bằng hình vuông, Nhóm học sinh làm thí nghiệm đo đạc..."
                                rows={6}
                            />
                        </div>
                    ) : (
                        <>
                            <div className="url-file-grid">
                                <div className="url-file-left">
                                    <div className="input-group">
                                        <label>URL bài viết</label>
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            onBlur={handleUrlBlur}
                                            placeholder="https://example.com/bai-viet-toan-hoc"
                                            disabled={!!fileContent}
                                        />
                                    </div>

                                    <div className="divider-text">
                                        <span>HOẶC</span>
                                    </div>

                                    <div className="input-group">
                                        <label>Upload file tài liệu</label>
                                        <div className="file-upload-wrapper">
                                            <input
                                                type="file"
                                                id="file-upload"
                                                accept=".pdf,.docx,.pptx,.doc,.txt"
                                                onChange={handleFileUpload}
                                                style={{ display: 'none' }}
                                                disabled={!!url}
                                            />
                                            <label htmlFor="file-upload" className={`file-upload-btn ${url ? 'disabled' : ''}`}>
                                                📄 Chọn file (PDF, DOCX, PPTX, DOC, TXT)
                                            </label>
                                            {fileName && (
                                                <div className="file-info">
                                                    <span className="file-name" title={fileName}>📎 {truncateFilename(fileName, 35)}</span>
                                                    <button
                                                        type="button"
                                                        className="file-remove-btn"
                                                        onClick={() => {
                                                            setUploadedFile(null);
                                                            setFileContent('');
                                                            setFileName('');
                                                            setContentSummary('');
                                                            document.getElementById('file-upload').value = '';
                                                        }}
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                        <p className="input-hint">Hỗ trợ PDF, DOCX, PPTX, DOC, TXT (tối đa 10MB)</p>
                                    </div>

                                    <div className="input-group">
                                        <label>Ý tưởng Storyboard (tùy chọn)</label>
                                        <textarea
                                            value={urlIdea}
                                            onChange={(e) => setUrlIdea(e.target.value)}
                                            placeholder="Nhập ý tưởng bổ sung cho storyboard, ví dụ: Tập trung vào phần thực hành, thêm ví dụ thực tế..."
                                            rows={4}
                                        />
                                        <p className="input-hint">Kết hợp nội dung từ URL/File với ý tưởng của bạn để tạo storyboard tốt hơn</p>
                                    </div>
                                </div>

                                <div className="url-file-right">
                                    <div className={`summary-box ${showSummary ? 'expanded' : 'collapsed'}`}>
                                        <div className="summary-header">
                                            <div className="summary-header-left">
                                                <h4>🔍 Phân tích nội dung</h4>
                                                {contentSummary && (
                                                    <span className="summary-badge">Đã phân tích</span>
                                                )}
                                            </div>
                                            <div className="summary-header-actions">
                                                {contentSummary && (
                                                    <button
                                                        className="btn-icon btn-view-detail"
                                                        onClick={() => setShowAnalysisModal(true)}
                                                        title="Xem chi tiết đầy đủ"
                                                    >
                                                        🔎
                                                    </button>
                                                )}
                                                {(url || fileContent) && (
                                                    <button
                                                        className="btn-icon"
                                                        onClick={() => generateSummary(fileContent || url, fileName || url)}
                                                        disabled={summarizing}
                                                        title="Phân tích lại"
                                                    >
                                                        {summarizing ? '⏳' : '🔄'}
                                                    </button>
                                                )}
                                                <button
                                                    className="btn-icon"
                                                    onClick={() => setShowSummary(!showSummary)}
                                                    title={showSummary ? 'Thu gọn' : 'Mở rộng'}
                                                >
                                                    {showSummary ? '▼' : '▶'}
                                                </button>
                                            </div>
                                        </div>
                                        {showSummary && (
                                            <>
                                                {summarizing ? (
                                                    <div className="summary-loading">
                                                        <div className="spinner" />
                                                        <p>Đang phân tích nội dung chi tiết...</p>
                                                    </div>
                                                ) : contentSummary ? (
                                                    <div className="summary-content summary-preview">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                        >
                                                            {contentSummary.substring(0, 500) + (contentSummary.length > 500 ? '...' : '')}
                                                        </ReactMarkdown>
                                                        {contentSummary.length > 500 && (
                                                            <button
                                                                className="btn-read-more"
                                                                onClick={() => setShowAnalysisModal(true)}
                                                            >
                                                                📖 Xem đầy đủ phân tích →
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <div className="summary-empty">
                                                        <div className="empty-icon">🔍</div>
                                                        <p>Nhập URL hoặc upload file để phân tích</p>
                                                        <small style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                                            Phân tích: Tổng quan, Cấu trúc, Khái niệm, Đề xuất
                                                        </small>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    <div className="input-row">
                        <div className="input-group">
                            <label>📊 Độ dài Storyboard</label>
                            <select value={duration} onChange={(e) => setDuration(e.target.value)}>
                                {VIDEO_DURATION_PRESETS.map(preset => (
                                    <option key={preset.value} value={preset.value}>{preset.label}</option>
                                ))}
                                <option value="custom">⚙️ Tùy chỉnh (nhập số từ)</option>
                            </select>
                            {duration === 'custom' && (
                                <>
                                    <input
                                        type="number"
                                        value={customDuration}
                                        onChange={(e) => setCustomDuration(e.target.value)}
                                        placeholder="Nhập số từ (200-5000 được khuyến nghị)"
                                        min="200"
                                        max="30000"
                                        className="custom-input"
                                    />
                                    <p className="input-hint">
                                        💡 Gợi ý: 300-500 từ (video ngắn), 800-1000 từ (chuẩn), 1500-2000 từ (dài)
                                    </p>
                                </>
                            )}
                            <p className="input-hint">
                                ⏱️ Độ dài tương ứng: {finalWordCount} từ - {durationDisplay}
                            </p>
                        </div>

                        <div className="input-group">
                            <label>Phong cách Hình ảnh</label>
                            <select value={style} onChange={(e) => setStyle(e.target.value)}>
                                {STORY_STYLES.map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            {style === '✨ Tùy chỉnh' && (
                                <input
                                    type="text"
                                    value={customStyle}
                                    onChange={(e) => setCustomStyle(e.target.value)}
                                    placeholder="Nhập phong cách hình ảnh"
                                    className="custom-input"
                                />
                            )}
                        </div>
                    </div>

                    {/* Advanced Options */}
                    <div className="advanced-options">
                        <h4>⚙️ Tùy chọn nâng cao</h4>
                        <div className="checkbox-group">
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={addBridgeScenes}
                                    onChange={(e) => setAddBridgeScenes(e.target.checked)}
                                />
                                <span>🎬 Thêm cảnh chuyển động nhân vật tự động (Bridge Scenes)</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={hideFormulas}
                                    onChange={(e) => setHideFormulas(e.target.checked)}
                                />
                                <span>🚫 Ẩn toàn bộ công thức và chữ trong video (Voice-only)</span>
                            </label>
                            <label className="checkbox-item">
                                <input
                                    type="checkbox"
                                    checked={ensureContinuity}
                                    onChange={(e) => setEnsureContinuity(e.target.checked)}
                                />
                                <span>🔗 Đảm bảo continuity (ánh sáng, hướng, vị trí nhân vật)</span>
                            </label>
                        </div>

                        <div className="input-group">
                            <label>Yêu cầu bổ sung (tùy chọn)</label>
                            <textarea
                                value={customInstructions}
                                onChange={(e) => setCustomInstructions(e.target.value)}
                                placeholder="Ví dụ: Thêm cảnh thực nghiệm, nhấn mạnh cảm xúc học sinh, sử dụng đạo cụ cụ thể..."
                                rows={3}
                            />
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {loading && (
                        <div className="progress-container">
                            <div className="progress-bar-wrapper">
                                <div className="progress-bar" style={{ width: `${progress}%` }}>
                                    <span className="progress-text">{progress}%</span>
                                </div>
                            </div>
                            <div className="progress-status">{progressStatus}</div>
                        </div>
                    )}

                    <div className="button-group">
                        <button
                            className="generate-btn"
                            onClick={handleGenerate}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <div className="spinner" />
                                    Đang tạo storyboard...
                                </>
                            ) : (
                                <>🎬 Tạo Storyboard</>
                            )}
                        </button>
                        {(idea || url || generatedStory) && (
                            <button
                                className="reset-btn"
                                onClick={() => {
                                    if (confirm('Xóa tất cả dữ liệu?')) {
                                        // Reset states
                                        setIdea('');
                                        setUrl('');
                                        setUploadedFile(null);
                                        setFileContent('');
                                        setFileName('');
                                        setContentSummary('');
                                        setUrlIdea('');
                                        setShowSummary(true);
                                        setGeneratedStory('');
                                        setDuration('1000');
                                        setCustomDuration('');
                                        setStyle('� Hoạt hình Pixar 3D (Mặc định)');
                                        setCustomStyle('');
                                        setCustomInstructions('');

                                        // Clear localStorage
                                        localStorage.removeItem('storyboard-mode');
                                        localStorage.removeItem('storyboard-idea');
                                        localStorage.removeItem('storyboard-url');
                                        localStorage.removeItem('storyboard-urlIdea');
                                        localStorage.removeItem('storyboard-fileContent');
                                        localStorage.removeItem('storyboard-fileName');
                                        localStorage.removeItem('storyboard-contentSummary');
                                        localStorage.removeItem('storyboard-showSummary');
                                        localStorage.removeItem('storyboard-duration');
                                        localStorage.removeItem('storyboard-customDuration');
                                        localStorage.removeItem('storyboard-style');
                                        localStorage.removeItem('storyboard-customStyle');
                                        localStorage.removeItem('storyboard-customInstructions');
                                        localStorage.removeItem('storyboard-generatedStory');
                                    }
                                }}
                                disabled={loading}
                            >
                                🗑️ Xóa tất cả
                            </button>
                        )}
                    </div>
                </div>

                {/* Output Section */}
                <div className="output-section">
                    {generatedStory ? (
                        <>
                            <div className="output-header">
                                <h3>Nội dung đã tạo</h3>
                                <div className="output-actions">
                                    {!isEditingStory ? (
                                        <>
                                            <button
                                                className="btn-secondary"
                                                onClick={() => copyToClipboard(generatedStory)}
                                            >
                                                📋 Sao chép
                                            </button>
                                            <button
                                                className="btn-edit"
                                                onClick={handleStartEditStory}
                                            >
                                                ✏️ Chỉnh sửa
                                            </button>
                                            <button
                                                className="btn-primary"
                                                onClick={handleSave}
                                            >
                                                💾 Lưu
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                className="btn-success"
                                                onClick={handleSaveEditedStory}
                                            >
                                                ✅ Lưu chỉnh sửa
                                            </button>
                                            <button
                                                className="btn-secondary"
                                                onClick={handleCancelEditStory}
                                            >
                                                ❌ Hủy
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="story-output">
                                {isEditingStory ? (
                                    <textarea
                                        value={editedStory}
                                        onChange={(e) => setEditedStory(e.target.value)}
                                        className="story-editor"
                                        placeholder="Chỉnh sửa storyboard tại đây..."
                                        rows={20}
                                    />
                                ) : (
                                    <pre>{generatedStory}</pre>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <div className="empty-icon">🎬</div>
                            <h3>Chưa có storyboard</h3>
                            <p>Nhập ý tưởng hoặc URL và nhấn "Tạo Storyboard" để bắt đầu</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Analysis Detail Modal */}
            {showAnalysisModal && contentSummary && (
                <div className="modal-overlay" onClick={() => setShowAnalysisModal(false)}>
                    <div className="modal-container analysis-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>🔍 Phân tích nội dung chi tiết</h2>
                            <button
                                className="modal-close-btn"
                                onClick={() => setShowAnalysisModal(false)}
                                title="Đóng"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="modal-body">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                            >
                                {contentSummary}
                            </ReactMarkdown>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn-secondary"
                                onClick={() => {
                                    navigator.clipboard.writeText(contentSummary);
                                    success('Đã sao chép phân tích!');
                                }}
                            >
                                📋 Sao chép
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => setShowAnalysisModal(false)}
                            >
                                Đóng
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StoryCreator;
