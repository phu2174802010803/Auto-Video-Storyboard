import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import './StoryHistory.css';

const StoryHistory = () => {
    const { stories, deleteStory, getMetadataForStory } = useApp();
    const { success, error } = useToast();
    const [selectedStory, setSelectedStory] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStyle, setFilterStyle] = useState('all');

    const filteredStories = stories.filter(story => {
        // Safe check: ensure fields exist before calling toLowerCase
        const content = story.content || '';
        const source = story.source || '';
        const style = story.style || '';

        const matchesSearch = content.toLowerCase().includes(searchTerm.toLowerCase()) ||
            source.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterStyle === 'all' || style === filterStyle;
        return matchesSearch && matchesFilter;
    });

    // Filter out undefined/null styles
    const uniqueStyles = [...new Set(stories.map(s => s.style).filter(Boolean))];

    const handleDelete = (id) => {
        if (confirm('Bạn có chắc muốn xóa storyboard này?')) {
            deleteStory(id);
            if (selectedStory?.id === id) {
                setSelectedStory(null);
            }
            success('Đã xóa storyboard');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        success('Đã sao chép!');
    };

    const exportStory = async (story) => {
        try {
            const result = await window.electronAPI.showSaveDialog({
                title: 'Xuất storyboard',
                defaultPath: `storyboard-${story.id}.txt`,
                filters: [
                    { name: 'Text Files', extensions: ['txt'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!result.canceled && result.filePath) {
                await window.electronAPI.saveFile({
                    filePath: result.filePath,
                    content: story.content
                });
                success('Đã xuất storyboard!');
            }
        } catch (err) {
            error(`Lỗi xuất file: ${err.message}`);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="story-history">
            <div className="history-header">
                <h2>Lịch sử Storyboard</h2>
                <p>Quản lý tất cả storyboard video đã tạo</p>
            </div>

            <div className="history-controls">
                <input
                    type="text"
                    className="search-input"
                    placeholder="🔍 Tìm kiếm storyboard..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                    className="filter-select"
                    value={filterStyle}
                    onChange={(e) => setFilterStyle(e.target.value)}
                >
                    <option value="all">Tất cả phong cách hình ảnh</option>
                    {uniqueStyles.map(style => (
                        <option key={style} value={style}>{style}</option>
                    ))}
                </select>
            </div>

            {filteredStories.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-icon">🎬</div>
                    <h3>Chưa có storyboard</h3>
                    <p>
                        {stories.length === 0
                            ? 'Hãy tạo storyboard đầu tiên!'
                            : 'Không tìm thấy storyboard phù hợp'}
                    </p>
                </div>
            ) : (
                <div className="history-grid">
                    {/* Story List */}
                    <div className="story-list">
                        {filteredStories.map(story => (
                            <div
                                key={story.id}
                                className={`story-card ${selectedStory?.id === story.id ? 'selected' : ''}`}
                                onClick={() => setSelectedStory(story)}
                            >
                                <div className="story-card-header">
                                    <span className="story-type">
                                        {story.sourceType === 'idea' ? '🎬' : '🔗'}
                                    </span>
                                    <span className="story-style-badge">{story.style}</span>
                                </div>
                                <div className="story-card-content">
                                    <p className="story-preview">
                                        {(story.content || '').substring(0, 120)}...
                                    </p>
                                    <div className="story-meta">
                                        <span>📝 {story.wordCount || 0} từ</span>
                                        <span>🕐 {formatDate(story.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Story Detail */}
                    {selectedStory && (
                        <div className="story-detail">
                            <div className="detail-header">
                                <h3>Chi tiết Storyboard</h3>
                                <div className="detail-actions">
                                    <button
                                        className="btn-icon"
                                        onClick={() => copyToClipboard(selectedStory.content)}
                                        title="Sao chép"
                                    >
                                        📋
                                    </button>
                                    <button
                                        className="btn-icon"
                                        onClick={() => exportStory(selectedStory)}
                                        title="Xuất file"
                                    >
                                        💾
                                    </button>
                                    <button
                                        className="btn-icon delete"
                                        onClick={() => handleDelete(selectedStory.id)}
                                        title="Xóa"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>

                            <div className="detail-info">
                                <div className="info-row">
                                    <span className="info-label">Nguồn:</span>
                                    <span className="info-value">{selectedStory.source || 'Không rõ'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Phong cách hình ảnh:</span>
                                    <span className="info-value">{selectedStory.style || 'Không rõ'}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Số từ:</span>
                                    <span className="info-value">{selectedStory.wordCount || 0}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Ngày tạo:</span>
                                    <span className="info-value">{formatDate(selectedStory.createdAt)}</span>
                                </div>
                            </div>

                            <div className="detail-content">
                                <h4>Nội dung</h4>
                                <div className="content-box">
                                    <pre>{selectedStory.content || 'Không có nội dung'}</pre>
                                </div>
                            </div>

                            {(() => {
                                const metadata = getMetadataForStory(selectedStory.id);
                                return metadata && (
                                    <div className="detail-metadata">
                                        <h4>Metadata</h4>
                                        <div className="metadata-box">
                                            <div className="metadata-field">
                                                <label>Tiêu đề:</label>
                                                <p>{metadata.title}</p>
                                            </div>
                                            <div className="metadata-field">
                                                <label>Mô tả:</label>
                                                <p>{metadata.description}</p>
                                            </div>
                                            <div className="metadata-field">
                                                <label>Hashtags:</label>
                                                <p className="hashtags">{metadata.hashtags?.join(' ')}</p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default StoryHistory;
