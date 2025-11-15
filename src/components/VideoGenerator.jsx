import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { useToast } from '../context/ToastContext';
import VideoPlayer from './VideoPlayer';
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
    const [selectedPrompts, setSelectedPrompts] = useState(new Set()); // Track selected prompts
    const [autoSave, setAutoSave] = useState(true); // Mặc định bật auto-save
    const [savePath, setSavePath] = useState(() => {
        // Load default save path from localStorage
        return localStorage.getItem('veo3-default-save-path') || '';
    });
    const [isRunning, setIsRunning] = useState(false);
    const [overallProgress, setOverallProgress] = useState({ current: 0, total: 0 });
    const [videoProgress, setVideoProgress] = useState({});
    const [logs, setLogs] = useState([]);
    const [shouldSaveHistory, setShouldSaveHistory] = useState(false); // Flag to trigger history save

    // Video merging states
    const [isMerging, setIsMerging] = useState(false);
    const [mergeProgress, setMergeProgress] = useState({ current: 0, total: 0 });
    const [mergedVideoUrl, setMergedVideoUrl] = useState(null);
    const [mergeLogs, setMergeLogs] = useState([]);
    const [hasMerged, setHasMerged] = useState(false); // Flag to prevent multiple merges

    // Frame extraction for scene continuity
    const [extractedFrames, setExtractedFrames] = useState({}); // Store extracted frames for each prompt

    // Video Configuration
    const [videoConfig, setVideoConfig] = useState({
        aspectRatio: '16:9', // 16:9 or 9:16
        model: 'veo3-fast', // veo3-fast, veo3-quality, veo2-fast, veo2-quality
        outputCount: 1, // Number of videos per prompt
        useExtractedFrames: true, // Use extracted frames for continuity
        autoMergeVideos: true // Auto-merge all videos into one complete video
    });

    // Calculate credits based on configuration
    const calculateCredits = (config) => {
        const creditMap = {
            'veo3-fast': 20,
            'veo3-quality': 100,
            'veo2-fast': 20,
            'veo2-quality': 100
        };

        const baseCredits = creditMap[config.model] || 20;
        return baseCredits * config.outputCount;
    };

    const totalCredits = calculateCredits(videoConfig);

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

    // Auto-save history when video generation completes
    useEffect(() => {
        if (shouldSaveHistory && !isRunning) {
            // Only save if we have video data
            if (Object.keys(videoProgress).length > 0 || logs.length > 0) {
                const promptItem = promptHistory.find(p => p.id === Number(selectedPromptId));
                const selectedAccount = veo3Accounts.find(acc => acc.id.toString() === selectedAccountId);

                const historyItem = {
                    id: Date.now(),
                    timestamp: new Date().toISOString(),
                    promptId: Number(selectedPromptId),
                    storyId: promptItem?.storyId,
                    storyTitle: promptItem?.storyTitle || 'Unknown',
                    accountName: selectedAccount?.name || 'Unknown',
                    totalVideos: prompts.filter(p => p.type === 'scene' && selectedPrompts.has(p.id)).length,
                    successCount: Object.values(videoProgress).filter(p => p.status === 'success').length,
                    logs: [...logs],
                    videoProgress: { ...videoProgress },
                    extractedFrames: { ...extractedFrames } // Save extracted frames for history
                };

                setVideoHistory(prevHistory => {
                    const updatedHistory = [historyItem, ...prevHistory];
                    localStorage.setItem('veo3-video-history', JSON.stringify(updatedHistory));
                    return updatedHistory;
                });

                setShouldSaveHistory(false);
            } else {
                setShouldSaveHistory(false);
            }
        }
    }, [shouldSaveHistory, isRunning, videoProgress, logs, selectedPromptId, promptHistory, veo3Accounts, selectedAccountId, prompts, selectedPrompts, extractedFrames]);

    // Auto-merge videos when all scenes are completed
    useEffect(() => {
        if (!isRunning && !isMerging && !hasMerged && videoConfig.autoMergeVideos) {
            const totalVideos = prompts.filter(p => p.type === 'scene' && selectedPrompts.has(p.id)).length;
            const successfulVideos = Object.values(videoProgress).filter(p => p.status === 'success').length;

            // Check if all videos are completed
            if (totalVideos > 0 && successfulVideos === totalVideos) {
                console.log('[VideoGenerator] All videos completed, starting auto-merge...');
                setTimeout(() => {
                    autoMergeVideos();
                }, 2000); // Wait 2 seconds for all processes to complete
            }
        }
    }, [isRunning, videoProgress, prompts, selectedPrompts, videoConfig.autoMergeVideos, isMerging, hasMerged]);

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
    // Extract SETTING CHUNG separately and create scene-only prompts
    const parsePromptsFromContent = (content) => {
        if (!content) return [];

        const lines = content.split('\n');
        const prompts = [];
        let settingChung = ''; // Store SETTING CHUNG separately
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

                    // Extract scene number from content (support 1, 1.1, 1.2 format)
                    const sceneNumberMatch = currentContent[0].match(/Scene\s*([\d.]+)/i);
                    const sceneNumber = sceneNumberMatch ? sceneNumberMatch[1] : sceneIndex.toString();

                    prompts.push({
                        id: `scene-${sceneNumber}`,
                        type: 'scene',
                        title: `Scene ${sceneNumber}`,
                        text: sceneContent, // Only scene content, no SETTING CHUNG
                        sceneOnly: sceneContent,
                        originalIndex: sceneNumber,
                        sceneNumber: sceneNumber,
                        isFirstScene: sceneIndex === 1 // Mark first scene
                    });
                }

                currentSection = 'setting';
                currentContent = [line];
            }
            // Detect Scene sections - support both old and new format (including sub-scenes like 1.1, 1.2)
            else if (
                line.match(/🎞️.*PROMPT.*Scene/i) ||
                line.match(/PROMPT.*Scene/i) ||
                line.match(/🎞️\s*Scene\s*\d+(\.\d+)?/i) ||  // Support Scene 1, Scene 1.1, Scene 1.2
                line.match(/^Scene\s*\d+(\.\d+)?/i)
            ) {
                // Save SETTING CHUNG if we were in that section
                if (currentSection === 'setting' && currentContent.length > 0) {
                    settingChung = currentContent.join('\n').trim();
                }
                // Save previous scene
                else if (currentSection === 'scene' && currentContent.length > 0) {
                    sceneIndex++;
                    const sceneContent = currentContent.join('\n').trim();

                    // Extract scene number from content (support 1, 1.1, 1.2 format)
                    const sceneNumberMatch = currentContent[0].match(/Scene\s*([\d.]+)/i);
                    const sceneNumber = sceneNumberMatch ? sceneNumberMatch[1] : sceneIndex.toString();

                    prompts.push({
                        id: `scene-${sceneNumber}`,
                        type: 'scene',
                        title: `Scene ${sceneNumber}`,
                        text: sceneContent, // Only scene content, no SETTING CHUNG
                        sceneOnly: sceneContent,
                        originalIndex: sceneNumber,
                        sceneNumber: sceneNumber,
                        isFirstScene: sceneIndex === 1 // Mark first scene
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

            // Extract scene number from content (support 1, 1.1, 1.2 format)
            const sceneNumberMatch = currentContent[0].match(/Scene\s*([\d.]+)/i);
            const sceneNumber = sceneNumberMatch ? sceneNumberMatch[1] : sceneIndex.toString();

            prompts.push({
                id: `scene-${sceneNumber}`,
                type: 'scene',
                title: `Scene ${sceneNumber}`,
                text: sceneContent, // Only scene content, no SETTING CHUNG
                sceneOnly: sceneContent,
                originalIndex: sceneNumber,
                sceneNumber: sceneNumber,
                isFirstScene: sceneIndex === 1 // Mark first scene
            });
        }

        // Store SETTING CHUNG globally for first scene
        if (settingChung) {
            prompts.settingChung = settingChung;
        }

        console.log('[VideoGenerator] Parsed prompts (scene-only):', prompts);
        console.log('[VideoGenerator] SETTING CHUNG length:', settingChung.length);
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

                // Auto-select all scene prompts
                const scenePrompts = parsedPrompts.filter(p => p.type === 'scene');
                setSelectedPrompts(new Set(scenePrompts.map(p => p.id)));
            }
        } else {
            setPrompts([]);
            setSelectedPrompts(new Set());
        }
    };

    // Handle individual prompt selection
    const handlePromptToggle = (promptId) => {
        const newSelected = new Set(selectedPrompts);
        if (newSelected.has(promptId)) {
            newSelected.delete(promptId);
        } else {
            newSelected.add(promptId);
        }
        setSelectedPrompts(newSelected);
    };

    // Handle select all prompts
    const handleSelectAll = () => {
        const scenePrompts = prompts.filter(p => p.type === 'scene');
        setSelectedPrompts(new Set(scenePrompts.map(p => p.id)));
    };

    // Handle deselect all prompts
    const handleDeselectAll = () => {
        setSelectedPrompts(new Set());
    };

    // Capture frame from video at the end (last frame) and save to file
    const captureVideoFrame = async (videoUrl, promptId) => {
        try {
            console.log('[VideoGenerator] Capturing frame for prompt:', promptId, 'from video:', videoUrl);

            // Create a video element to load and capture frame
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.preload = 'metadata';

            // Wait for video to load metadata
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = resolve;
                video.onerror = reject;
                video.src = videoUrl.startsWith('http') ? videoUrl : `local://${encodeURIComponent(videoUrl)}`;
            });

            // Set to last frame
            video.currentTime = video.duration - 0.1; // Slightly before end to ensure we get a frame

            // Wait for seek to complete
            await new Promise((resolve) => {
                video.onseeked = resolve;
                video.onerror = resolve; // Continue even if seek fails
            });

            // Create canvas and capture frame
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            ctx.drawImage(video, 0, 0);

            // Convert to ArrayBuffer
            const arrayBuffer = await new Promise(resolve => {
                canvas.toBlob(blob => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsArrayBuffer(blob);
                }, 'image/jpeg', 0.8);
            });

            if (!arrayBuffer || !savePath) {
                console.error('[VideoGenerator] ❌ No arrayBuffer or save path');
                return null;
            }

            // Generate filename for frame
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `frame_scene_${promptId}_${timestamp}.jpg`;

            // Save file using electron API
            const result = await window.electronAPI.saveFrameFile({
                filePath: `${savePath}/${filename}`,
                arrayBuffer: arrayBuffer
            });

            if (result.success) {
                const frameFilePath = result.filePath;

                // Extract scene key from promptId (supports decimals e.g., "scene-1.1")
                const sceneKeyMatch = promptId.match(/scene-([\d.]+)/i);
                const sceneKey = sceneKeyMatch ? sceneKeyMatch[1] : null;

                if (sceneKey) {
                    setExtractedFrames(prev => ({
                        ...prev,
                        [sceneKey]: frameFilePath
                    }));
                } else {
                    console.warn('[VideoGenerator] ⚠️ Could not extract scene key from promptId:', promptId);
                }

                return frameFilePath;
            } else {
                console.error('[VideoGenerator] ❌ Failed to save frame file:', result.error);
                return null;
            }

        } catch (error) {
            console.error('[VideoGenerator] ❌ Error capturing frame:', error);
            return null;
        }
    };

    // Auto-capture frame when video generation completes
    const autoCaptureFrameForNextScene = async (completedPromptId, videoUrl) => {
        try {
            if (!videoUrl) return;
            await captureVideoFrame(videoUrl, completedPromptId);
        } catch (error) {
            console.error('[VideoGenerator] ❌ Error in auto-capture:', error);
        }
    };

    // Auto-merge videos when all scenes are completed
    const autoMergeVideos = async () => {
        if (!videoConfig.autoMergeVideos || hasMerged || isMerging) {
            console.log('[VideoGenerator] Merge skipped - autoMergeVideos:', videoConfig.autoMergeVideos, 'hasMerged:', hasMerged, 'isMerging:', isMerging);
            return;
        }

        try {
            // Get all successful video URLs
            const successfulVideos = Object.values(videoProgress)
                .filter(progress => progress.status === 'success' && progress.videoUrl)
                .map(progress => progress.videoUrl)
                .filter(url => url && !url.startsWith('http')); // Only local MP4 files

            if (successfulVideos.length < 2) {
                console.log('[VideoGenerator] Not enough videos to merge:', successfulVideos.length);
                return;
            }

            console.log('[VideoGenerator] Starting auto-merge of', successfulVideos.length, 'videos');
            setHasMerged(true); // Set flag to prevent multiple merges
            setIsMerging(true);
            setMergeProgress({ current: 0, total: successfulVideos.length });
            setMergeLogs([]);

            const result = await window.electronAPI.mergeVideos({
                videoPaths: successfulVideos,
                outputPath: savePath,
                outputFileName: `merged_video_${Date.now()}.mp4`
            });

            if (result.success) {
                setMergedVideoUrl(result.outputPath);
                success(`Đã ghép thành công ${successfulVideos.length} video thành 1 video hoàn chỉnh!`);
                console.log('[VideoGenerator] ✅ Video merge completed:', result.outputPath);
            } else {
                showError(`Lỗi khi ghép video: ${result.error}`);
                console.error('[VideoGenerator] ❌ Video merge failed:', result.error);
                setHasMerged(false); // Reset flag on error to allow retry
            }
        } catch (error) {
            console.error('[VideoGenerator] ❌ Error in auto-merge:', error);
            showError(`Lỗi khi ghép video: ${error.message}`);
            setHasMerged(false); // Reset flag on error to allow retry
        } finally {
            setIsMerging(false);
        }
    };


    // Set default save folder
    const handleSetDefaultFolder = async () => {
        try {
            const result = await window.electronAPI.selectDownloadDirectory();
            if (result && result.success && result.path) {
                setSavePath(result.path);
                localStorage.setItem('veo3-default-save-path', result.path);
                success('Đã chọn thư mục lưu video & frame và set làm mặc định!');
            }
        } catch (error) {
            console.error('Error setting default folder:', error);
            showError('Lỗi khi chọn thư mục!');
        }
    };

    // Open video save folder
    const handleOpenVideoFolder = async () => {
        try {
            if (savePath) {
                await window.electronAPI.openFile(savePath);
            } else {
                warning('Chưa chọn thư mục lưu video & frame!');
            }
        } catch (error) {
            console.error('Error opening folder:', error);
            showError('Lỗi khi mở thư mục!');
        }
    };

    // Setup Veo3 log listener
    useEffect(() => {
        if (!window.electronAPI || !window.electronAPI.onVeo3Log) {
            console.error('[VideoGenerator] ❌ electronAPI.onVeo3Log is not available!');
            return;
        }

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
                setVideoProgress(prev => {
                    const existingProgress = prev[logData.promptId];

                    // CRITICAL: Don't overwrite 'success' status with 'processing'
                    // Only update if:
                    // 1. No existing progress, OR
                    // 2. New status is 'success' or 'error', OR
                    // 3. Existing status is not 'success' (allow processing -> processing updates)
                    const shouldUpdate =
                        !existingProgress ||
                        logData.status === 'success' ||
                        logData.status === 'error' ||
                        existingProgress.status !== 'success';

                    if (!shouldUpdate) {
                        // Don't update - keep existing success status
                        return prev;
                    }

                    const updated = {
                        ...prev,
                        [logData.promptId]: {
                            status: logData.status,
                            videoUrl: logData.videoUrl || existingProgress?.videoUrl, // Keep existing videoUrl if new one is empty
                            message: logData.message
                        }
                    };
                    return updated;
                });
            }

            // Update overall progress
            if (logData.status === 'success') {
                setOverallProgress(prev => ({
                    ...prev,
                    current: prev.current + 1
                }));

                // Auto-capture frame for next scene continuity
                // ONLY capture when video is saved locally (not Google Storage URL which causes CORS)
                // CRITICAL: Reduce delay to 500ms (was 2000ms) to capture frame ASAP before next scene starts
                if (logData.promptId && logData.videoUrl && !logData.videoUrl.startsWith('http')) {
                    setTimeout(() => {
                        autoCaptureFrameForNextScene(logData.promptId, logData.videoUrl);
                    }, 500); // Giảm từ 2000ms xuống 500ms để capture frame nhanh hơn
                }
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

        if (!savePath) {
            warning('Vui lòng chọn thư mục lưu video & frame trước khi tạo!');
            return;
        }

        const selectedAccount = veo3Accounts.find(acc => acc.id.toString() === selectedAccountId);
        if (!selectedAccount) {
            showError('Không tìm thấy tài khoản!');
            return;
        }

        // Filter out setting prompts and only include selected prompts
        const videoPrompts = prompts.filter(p => p.type === 'scene' && selectedPrompts.has(p.id));

        if (videoPrompts.length === 0) {
            warning('Vui lòng chọn ít nhất một scene để tạo video!');
            return;
        }

        setIsRunning(true);
        setLogs([]);
        setVideoProgress({});
        setOverallProgress({ current: 0, total: videoPrompts.length });

        try {
            // Get SETTING CHUNG from parsed prompts
            const settingChung = prompts.settingChung || '';
            console.log('[VideoGenerator] SETTING CHUNG length:', settingChung.length);

            // Prepare prompts with extracted frames for continuity (optional)
            const promptsWithFrames = videoPrompts.map((prompt, index) => {
                // Use index in the current batch (0-based), not originalIndex
                // Scene 1 (index=0) → no frame
                // Scene 2 (index=1) → frame from Scene 1 (originalIndex of prompts[0])
                // Scene 3 (index=2) → frame from Scene 2 (originalIndex of prompts[1])

                let extractedFrame = null;
                if (videoConfig.useExtractedFrames && index > 0) {
                    // Get the previous prompt in the CURRENT batch
                    const previousPrompt = videoPrompts[index - 1];
                    if (previousPrompt && previousPrompt.originalIndex) {
                        // Look up frame using previous prompt's originalIndex
                        extractedFrame = extractedFrames[previousPrompt.originalIndex] || null;
                    }
                }

                // Create enhanced prompt text based on scene position
                let enhancedPromptText = prompt.text;

                // First scene: Include SETTING CHUNG + Scene
                if (index === 0 && settingChung) {
                    enhancedPromptText = `${settingChung}\n\n---\n\n${prompt.text}`;
                    console.log('[VideoGenerator] First scene: Adding SETTING CHUNG + Scene');
                } else {
                    // Subsequent scenes: Only scene content (no SETTING CHUNG)
                    enhancedPromptText = prompt.text;
                    console.log('[VideoGenerator] Subsequent scene: Only scene content');
                }

                // Add frame information if using extracted frames
                if (videoConfig.useExtractedFrames && extractedFrame) {
                    enhancedPromptText = `[FRAME_FILE:${extractedFrame}]\n${enhancedPromptText}`;
                }

                return {
                    ...prompt,
                    text: enhancedPromptText,
                    extractedFrame: videoConfig.useExtractedFrames ? extractedFrame : null, // Include frame data for backend processing
                    sceneIndex: prompt.originalIndex, // Keep original scene number for reference
                    batchIndex: index, // Add batch index for debugging
                    isFirstScene: index === 0 // Mark first scene for backend processing
                };
            });


            const result = await window.electronAPI.startVeo3Automation({
                prompts: promptsWithFrames,
                cookieString: selectedAccount.cookie,
                videoConfig: videoConfig,
                autoSaveConfig: {
                    enabled: true, // Luôn bật auto-save
                    path: savePath
                }
            });

            if (result.success) {
                success(`Hoàn thành! Đã xử lý ${result.processed}/${result.total} video`);

                // Trigger auto-save history via useEffect
                // Wait for frame extraction to complete (frame capture has 2s delay)
                setTimeout(() => {
                    setShouldSaveHistory(true);
                }, 3500);
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

            // If deleted item was currently selected, reset selection
            if (selectedPromptId === id.toString()) {
                setSelectedPromptId('');
                setPrompts([]);
                setSelectedPrompts(new Set());
                setVideoProgress({});
                setLogs([]);
                setOverallProgress({ current: 0, total: 0 });
            }

            success('Đã xóa lịch sử!');
        }
    };

    // Reset to default state
    const handleResetToDefault = () => {
        if (confirm('Bạn có chắc muốn reset về mặc định? Tất cả dữ liệu sẽ bị xóa!')) {
            // Reset all states
            setSelectedAccountId('');
            setSelectedPromptId('');
            setPrompts([]);
            setSelectedPrompts(new Set());
            setAutoSave(false);
            setSavePath('');
            setVideoProgress({});
            setLogs([]);
            setOverallProgress({ current: 0, total: 0 });

            success('Đã reset về mặc định!');
        }
    };

    // Load history item - restore video generation state
    const handleLoadHistoryItem = (item) => {

        setActiveTab('create');
        setSelectedPromptId(item.promptId.toString());

        // Reset merge states when loading history
        setHasMerged(false);
        setMergedVideoUrl(null);
        setIsMerging(false);
        setMergeProgress({ current: 0, total: 0 });

        // Parse and set prompts from prompt history
        const promptItem = promptHistory.find(p => p.id === item.promptId);

        if (!promptItem) {
            showError('Không tìm thấy prompt trong lịch sử!');
            return;
        }

        const parsedPrompts = parsePromptsFromContent(promptItem.content);
        const scenePrompts = parsedPrompts.filter(p => p.type === 'scene');

        // Set prompts and selections
        setPrompts(parsedPrompts);
        setSelectedPrompts(new Set(scenePrompts.map(p => p.id)));

        // Restore video progress with correct prompt ID mapping
        let restoredProgress = {};

        if (item.videoProgress && Object.keys(item.videoProgress).length > 0) {
            // Map old prompt IDs to new prompt IDs based on position
            const oldProgressKeys = Object.keys(item.videoProgress);

            scenePrompts.forEach((prompt, index) => {
                // Map by position in the array
                if (index < oldProgressKeys.length) {
                    const oldKey = oldProgressKeys[index];
                    const oldProgress = item.videoProgress[oldKey];
                    // Only restore if status is 'success' or 'error' (final states)
                    if (oldProgress && (oldProgress.status === 'success' || oldProgress.status === 'error')) {
                        restoredProgress[prompt.id] = oldProgress;
                    }
                }
            });

            setVideoProgress(restoredProgress);
        } else if (item.logs && item.logs.length > 0) {
            // Fallback: restore from logs - find LAST success log for each unique promptId

            // Group logs by promptId and get last success for each
            const logsByPromptId = {};
            item.logs.forEach(log => {
                if (log.promptId && log.status === 'success' && log.videoUrl) {
                    // Keep overwriting with later logs - last one wins
                    logsByPromptId[log.promptId] = {
                        status: log.status,
                        videoUrl: log.videoUrl,
                        message: log.message
                    };
                }
            });

            // Map to current scene prompts by index
            const oldPromptIds = Object.keys(logsByPromptId);
            scenePrompts.forEach((prompt, index) => {
                if (index < oldPromptIds.length) {
                    const oldPromptId = oldPromptIds[index];
                    restoredProgress[prompt.id] = logsByPromptId[oldPromptId];
                }
            });

            setVideoProgress(restoredProgress);
        } else {
            setVideoProgress({});
        }

        // Debug: Log what we're restoring
        console.log('[VideoGenerator] Restoring videoProgress:', Object.keys(restoredProgress).length, 'items');
        Object.entries(restoredProgress).forEach(([id, prog]) => {
            console.log(`[VideoGenerator] - ${id}: status=${prog.status}, hasVideoUrl=${!!prog.videoUrl}`);
        });

        // Restore logs (without triggering real-time updates)
        // NOTE: We restore videoProgress first, then logs
        // The listener logic will NOT overwrite 'success' status with 'processing' from old logs
        if (item.logs) {
            setLogs(item.logs);
        } else {
            setLogs([]);
        }

        // Restore extracted frames - IMPORTANT: Do this AFTER setting prompts
        if (item.extractedFrames && Object.keys(item.extractedFrames).length > 0) {
            setExtractedFrames(item.extractedFrames);
        } else {
            setExtractedFrames({});
        }

        const videoCount = item.videoProgress ? Object.keys(item.videoProgress).length :
            item.logs ? item.logs.filter(log => log.status === 'success').length : 0;
        const frameCount = item.extractedFrames ? Object.keys(item.extractedFrames).length : 0;

        if (videoCount > 0 || frameCount > 0) {
            let message = 'Đã khôi phục từ lịch sử: ';
            const parts = [];
            if (videoCount > 0) parts.push(`${videoCount} video`);
            if (frameCount > 0) parts.push(`${frameCount} khung hình`);
            success(message + parts.join(', ') + '!');
        } else {
            success('Đã tải prompt từ lịch sử!');
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
                                        (Sẽ tạo <strong>{prompts.filter(p => p.type === 'scene').length * videoConfig.outputCount}</strong> video)
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Video Configuration */}
                        <div className="form-group">
                            <label>⚙️ Cấu Hình Video:</label>
                            <div className="config-grid">
                                {/* Aspect Ratio */}
                                <div className="config-item">
                                    <label className="config-label">Tỷ lệ khung hình:</label>
                                    <select
                                        value={videoConfig.aspectRatio}
                                        onChange={(e) => setVideoConfig(prev => ({ ...prev, aspectRatio: e.target.value }))}
                                        className="config-select"
                                        disabled={isRunning}
                                    >
                                        <option value="16:9">Khổ ngang (16:9)</option>
                                        <option value="9:16">Khổ dọc (9:16)</option>
                                    </select>
                                </div>

                                {/* Model Selection */}
                                <div className="config-item">
                                    <label className="config-label">Mô hình:</label>
                                    <select
                                        value={videoConfig.model}
                                        onChange={(e) => setVideoConfig(prev => ({ ...prev, model: e.target.value }))}
                                        className="config-select"
                                        disabled={isRunning}
                                    >
                                        <option value="veo3-fast">Veo 3.1 - Fast</option>
                                        <option value="veo3-quality">Veo 3 - Quality</option>
                                        <option value="veo2-fast">Veo 2 - Fast</option>
                                        <option value="veo2-quality">Veo 2 - Quality</option>
                                    </select>
                                </div>

                                {/* Output Count */}
                                <div className="config-item">
                                    <label className="config-label">Số video mỗi prompt:</label>
                                    <select
                                        value={videoConfig.outputCount}
                                        onChange={(e) => setVideoConfig(prev => ({ ...prev, outputCount: parseInt(e.target.value) }))}
                                        className="config-select"
                                        disabled={isRunning}
                                    >
                                        <option value={1}>1</option>
                                        <option value={2}>2</option>
                                        <option value={3}>3</option>
                                        <option value={4}>4</option>
                                    </select>
                                </div>

                                {/* Use Extracted Frames Toggle */}
                                <div className="config-item">
                                    <label className="config-label">Đồng nhất nhân vật (dùng frame trước):</label>
                                    <label className="checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={videoConfig.useExtractedFrames}
                                            onChange={(e) => setVideoConfig(prev => ({ ...prev, useExtractedFrames: e.target.checked }))}
                                            disabled={isRunning}
                                        />
                                        <span>
                                            {videoConfig.useExtractedFrames ? 'Bật: Sử dụng khung hình từ scene trước' : 'Tắt: Không upload frame (tạo bình thường)'}
                                        </span>
                                    </label>
                                </div>

                                {/* Auto Merge Videos Toggle */}
                                <div className="config-item">
                                    <label className="config-label">Tự động ghép video:</label>
                                    <label className="checkbox-item" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <input
                                            type="checkbox"
                                            checked={videoConfig.autoMergeVideos}
                                            onChange={(e) => setVideoConfig(prev => ({ ...prev, autoMergeVideos: e.target.checked }))}
                                            disabled={isRunning || isMerging}
                                        />
                                        <span>
                                            {videoConfig.autoMergeVideos ? 'Bật: Tự động ghép tất cả video thành 1 video hoàn chỉnh' : 'Tắt: Giữ riêng từng video scene'}
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Credit Information */}
                            <div className="credit-info">
                                <p className="credit-text">
                                    Dựa trên chế độ cài đặt hiện tại, bạn cần dùng <strong>{totalCredits} tín dụng</strong> cho mỗi lần tạo.
                                </p>
                            </div>
                        </div>

                        {/* Thư mục lưu trữ (Bắt buộc) */}
                        <div className="form-group">
                            <label>📁 Thư mục lưu trữ video & frame (Bắt buộc):</label>
                            <div className="save-path-group">
                                <button
                                    onClick={handleSetDefaultFolder}
                                    className="btn-secondary"
                                    disabled={isRunning}
                                    title="Chọn thư mục lưu video và frame, đồng thời set làm mặc định"
                                >
                                    📁 Chọn Thư Mục & Set Mặc Định
                                </button>
                            </div>
                            {savePath ? (
                                <div className="save-path-display success">
                                    ✅ Lưu video & frame tại: {savePath}
                                </div>
                            ) : (
                                <div className="save-path-display error">
                                    ❌ Chưa chọn thư mục lưu trữ
                                </div>
                            )}
                            <div className="save-path-info">
                                <p className="hint-text">
                                    💡 Video và khung hình (frame) sẽ được lưu cùng trong thư mục này
                                </p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="action-buttons">
                            <div className="action-buttons-main">
                                {!isRunning ? (
                                    <button
                                        onClick={handleStart}
                                        disabled={!selectedAccountId || selectedPrompts.size === 0 || !savePath}
                                        className="btn-primary"
                                    >
                                        🚀 Bắt Đầu Tạo Video ({selectedPrompts.size * videoConfig.outputCount} video)
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
                            <div className="action-buttons-secondary">
                                <button
                                    onClick={handleResetToDefault}
                                    className="btn-secondary"
                                    disabled={isRunning}
                                >
                                    🔄 Reset Mặc Định
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Results Section */}
                    {prompts.length > 0 && (
                        <div className="results-section">
                            <div className="section-header-bar">
                                <h2>📊 Danh Sách Prompts</h2>
                                <div className="prompts-controls">
                                    <span className="prompts-count">
                                        {selectedPrompts.size}/{prompts.filter(p => p.type === 'scene').length} scenes được chọn
                                        ({selectedPrompts.size * videoConfig.outputCount} video)
                                    </span>
                                    <div className="selection-buttons">
                                        <button
                                            onClick={handleSelectAll}
                                            disabled={isRunning || prompts.filter(p => p.type === 'scene').length === 0}
                                            className="btn-secondary small"
                                        >
                                            ✅ Chọn Tất Cả
                                        </button>
                                        <button
                                            onClick={handleDeselectAll}
                                            disabled={isRunning || selectedPrompts.size === 0}
                                            className="btn-secondary small"
                                        >
                                            ❌ Bỏ Chọn Tất Cả
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Prompt Cards Grid - Only scenes, each includes SETTING CHUNG */}
                            <div className="prompt-cards-grid">
                                {prompts.filter(p => p.type === 'scene').map((prompt, index) => {
                                    const progress = videoProgress[prompt.id];
                                    const statusClass = progress?.status || 'ready';

                                    // Check if this scene should show extracted frame from previous scene
                                    const sceneIndex = prompt.originalIndex; // can be "1" or "1.1"
                                    // Look up previous scene key properly (handles sub-scenes)
                                    let prevSceneKey = null;
                                    if (typeof sceneIndex === 'string' && sceneIndex.includes('.')) {
                                        const [main, sub] = sceneIndex.split('.');
                                        const subNum = parseInt(sub, 10);
                                        if (!isNaN(subNum) && subNum > 1) {
                                            prevSceneKey = `${main}.${subNum - 1}`; // 1.2 -> 1.1
                                        } else {
                                            const mainNum = parseInt(main, 10);
                                            if (!isNaN(mainNum) && mainNum > 1) prevSceneKey = String(mainNum - 1); // 2.1 -> 1
                                        }
                                    } else {
                                        const num = parseInt(sceneIndex, 10);
                                        if (!isNaN(num) && num > 1) prevSceneKey = String(num - 1); // 2 -> 1
                                    }

                                    const extractedFrame = prevSceneKey ? extractedFrames[prevSceneKey] : null;

                                    return (
                                        <div key={prompt.id} className={`prompt-card scene ${statusClass}`}>
                                            <div className="prompt-card-header">
                                                <div className="prompt-card-title-row">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPrompts.has(prompt.id)}
                                                        onChange={() => handlePromptToggle(prompt.id)}
                                                        disabled={isRunning}
                                                        className="prompt-checkbox"
                                                    />
                                                    <h4 className="prompt-card-title">
                                                        🎞️ Scene {prompt.sceneNumber || prompt.originalIndex}
                                                        {extractedFrame && (
                                                            <span className="frame-indicator">📸</span>
                                                        )}
                                                    </h4>
                                                </div>
                                                <div className="prompt-card-actions">
                                                    {index === 0 ? (
                                                        <span className="ready-badge">
                                                            🧱 + Scene (Đầu tiên)
                                                        </span>
                                                    ) : (
                                                        <span className="ready-badge">
                                                            🎬 Scene (Tiếp theo)
                                                        </span>
                                                    )}
                                                    {prompt.sceneNumber && prompt.sceneNumber.includes('.') && (
                                                        <span className="sub-scene-badge" title="Prompt con của cùng 1 cảnh">
                                                            🔗 Prompt con
                                                        </span>
                                                    )}
                                                    {extractedFrame && (
                                                        <span className="frame-badge">
                                                            📷 Frame từ Scene {prevSceneKey}
                                                        </span>
                                                    )}
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
                                                {/* Display extracted frame from previous scene */}
                                                {extractedFrame && (
                                                    <div className="extracted-frame-display">
                                                        <div className="frame-header">
                                                            <span className="frame-label">📷 Khung hình từ Scene {prevSceneKey}</span>
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('Bạn có chắc muốn xóa khung hình này?')) {
                                                                        try {
                                                                            // Delete file from disk
                                                                            const deleteResult = await window.electronAPI.deleteFile(extractedFrame);
                                                                            if (deleteResult.success) {
                                                                                // Remove using the exact previous scene key
                                                                                setExtractedFrames(prev => {
                                                                                    const updated = { ...prev };
                                                                                    if (prevSceneKey) delete updated[prevSceneKey];
                                                                                    return updated;
                                                                                });
                                                                                success('Đã xóa khung hình!');
                                                                            } else {
                                                                                showError('Lỗi khi xóa khung hình từ ổ đĩa!');
                                                                            }
                                                                        } catch (error) {
                                                                            console.error('Error deleting frame file:', error);
                                                                            showError('Lỗi khi xóa khung hình!');
                                                                        }
                                                                    }
                                                                }}
                                                                className="btn-remove-frame"
                                                                title="Xóa khung hình này"
                                                            >
                                                                ❌
                                                            </button>
                                                        </div>
                                                        <div className="frame-preview">
                                                            <img
                                                                src={`local://${encodeURIComponent(extractedFrame)}`}
                                                                alt={`Frame từ Scene ${sceneIndex - 1}`}
                                                                className="extracted-frame-image"
                                                                onError={(e) => {
                                                                    console.error('[VideoGenerator] ❌ Failed to load frame image:', extractedFrame);
                                                                    e.target.style.display = 'none';
                                                                    e.target.parentElement.innerHTML = `<p style="color: #ff6b6b; text-align: center;">❌ Không thể tải khung hình<br/><small>${extractedFrame}</small></p>`;
                                                                }}
                                                                onLoad={() => {
                                                                    console.log('[VideoGenerator] ✅ Frame image loaded successfully:', extractedFrame);
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="frame-info">
                                                            <small>
                                                                File: {extractedFrame.split('/').pop()}<br />
                                                                Khung hình cuối sẽ được sử dụng làm ảnh đầu vào cho scene này
                                                            </small>
                                                            <div className="frame-actions">
                                                                <button
                                                                    onClick={() => window.electronAPI.openFile(extractedFrame)}
                                                                    className="btn-open-frame"
                                                                    title="Mở khung hình trong thư mục"
                                                                >
                                                                    📁 Mở File
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="prompt-preview-box">
                                                    {progress?.status === 'processing' ? (
                                                        <div className="video-progress-display">
                                                            <div className="progress-spinner">
                                                                <div className="spinner"></div>
                                                            </div>
                                                            <p className="progress-text">Đang tạo video...</p>
                                                            <p className="progress-subtext">Vui lòng đợi trong giây lát</p>
                                                        </div>
                                                    ) : progress?.status === 'success' ? (
                                                        <div className="video-preview-container">
                                                            {progress.videoUrl && (() => {
                                                                // Check if it's a local MP4 file
                                                                const isLocalMp4 = !progress.videoUrl.startsWith('http') &&
                                                                    progress.videoUrl.toLowerCase().endsWith('.mp4');
                                                                const isMp4Url = progress.videoUrl.toLowerCase().includes('.mp4');

                                                                if (isLocalMp4 || isMp4Url) {
                                                                    // Use custom VideoPlayer for MP4 files
                                                                    return (
                                                                        <VideoPlayer
                                                                            videoUrl={progress.videoUrl}
                                                                            promptId={prompt.id}
                                                                            onCaptureFrame={captureVideoFrame}
                                                                        />
                                                                    );
                                                                } else {
                                                                    // Not MP4 or unsupported format
                                                                    return (
                                                                        <div className="video-info-container">
                                                                            <p className="video-format-info">
                                                                                📁 File: {progress.videoUrl.split('/').pop()}
                                                                            </p>
                                                                            <button
                                                                                onClick={() => window.open(progress.videoUrl, '_blank')}
                                                                                className="btn-view-video-small"
                                                                            >
                                                                                👁️ Mở File
                                                                            </button>
                                                                        </div>
                                                                    );
                                                                }
                                                            })()}
                                                        </div>
                                                    ) : progress?.status === 'error' ? (
                                                        <div className="video-error-display">
                                                            <div className="error-icon">❌</div>
                                                            <p className="error-text">Lỗi khi tạo video</p>
                                                        </div>
                                                    ) : (
                                                        <p className="preview-label">Kết quả sẽ hiển thị ở đây</p>
                                                    )}
                                                </div>
                                                <div className="prompt-text-content">
                                                    {/* Display scene-only text in card, but full text will be sent to Veo3 */}
                                                    <p className="prompt-text">{prompt.sceneOnly || prompt.text}</p>
                                                    <div className="prompt-info-badge">
                                                        {index === 0 ? (
                                                            <span>💡 Prompt đầu tiên: SETTING CHUNG + Scene (tạo video hoàn chỉnh)</span>
                                                        ) : (
                                                            <span>💡 Prompt tiếp theo: Chỉ Scene (sử dụng frame từ scene trước)</span>
                                                        )}
                                                        {prompt.sceneNumber && prompt.sceneNumber.includes('.') && (
                                                            <span className="continuity-info">
                                                                + Prompt con (ghép video để có thoại đầy đủ)
                                                            </span>
                                                        )}
                                                        {extractedFrame && (
                                                            <span className="continuity-info">
                                                                + Khung hình từ scene trước
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {progress?.videoUrl && (
                                                <div className="prompt-card-footer">
                                                    <button
                                                        onClick={handleOpenVideoFolder}
                                                        className="btn-view-video"
                                                    >
                                                        📁 Mở thư mục lưu video & frame
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

                            {/* Video Merging Progress */}
                            {isMerging && (
                                <div className="merge-progress">
                                    <div className="progress-header">
                                        <span>🔄 Đang ghép video</span>
                                        <span className="progress-text">
                                            {mergeProgress.current}/{mergeProgress.total} video ({Math.round((mergeProgress.current / mergeProgress.total) * 100)}%)
                                        </span>
                                    </div>
                                    <div className="progress-bar-wrapper">
                                        <div
                                            className="progress-bar merge-progress-bar"
                                            style={{ width: `${(mergeProgress.current / mergeProgress.total) * 100}%` }}
                                        />
                                    </div>
                                    <p className="merge-status">Đang ghép tất cả video thành 1 video hoàn chỉnh...</p>
                                </div>
                            )}

                            {/* Merged Video Result */}
                            {mergedVideoUrl && (
                                <div className="merged-video-result">
                                    <div className="result-header">
                                        <h3>🎬 Video Hoàn Chỉnh</h3>
                                        <span className="success-badge">✅ Đã ghép thành công</span>
                                    </div>
                                    <div className="merged-video-info">
                                        <p className="video-path">📁 Đường dẫn: {mergedVideoUrl}</p>
                                        <div className="merged-video-actions">
                                            <button
                                                onClick={() => window.electronAPI.openFile(mergedVideoUrl)}
                                                className="btn-view-video"
                                            >
                                                📁 Mở thư mục
                                            </button>
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(mergedVideoUrl);
                                                    success('Đã copy đường dẫn!');
                                                }}
                                                className="btn-copy-url"
                                            >
                                                📋 Copy đường dẫn
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setHasMerged(false);
                                                    setMergedVideoUrl(null);
                                                    success('Đã reset trạng thái ghép video!');
                                                }}
                                                className="btn-secondary"
                                                style={{ background: '#6B7280', color: 'white' }}
                                            >
                                                🔄 Reset
                                            </button>
                                        </div>
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
                                            <div className="history-item-actions">
                                                <button
                                                    onClick={() => handleLoadHistoryItem(item)}
                                                    className="btn-load-history"
                                                >
                                                    📂 Tải
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteHistory(item.id)}
                                                    className="btn-delete-history"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
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
