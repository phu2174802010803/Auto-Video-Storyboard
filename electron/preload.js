const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Story generation
    generateStoryFromIdea: (params) => ipcRenderer.invoke('generate-story-from-idea', params),
    generateStoryFromUrl: (params) => ipcRenderer.invoke('generate-story-from-url', params),
    generateMetadata: (params) => ipcRenderer.invoke('generate-metadata', params),

    // Progress tracking
    onProgressUpdate: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('progress-update', subscription);
        return () => ipcRenderer.removeListener('progress-update', subscription);
    },

    // File dialogs
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    selectDownloadDirectory: () => ipcRenderer.invoke('select-download-directory'),
    importPromptsFromFile: () => ipcRenderer.invoke('import-prompts-from-file'),

    // File system
    saveFile: (params) => ipcRenderer.invoke('save-file', params),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    readFileContent: (filePath) => ipcRenderer.invoke('read-file-content', filePath),
    generateContentSummary: (params) => ipcRenderer.invoke('generate-content-summary', params),
    openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
    saveFrameFile: (params) => ipcRenderer.invoke('save-frame-file', params),
    deleteFile: (filePath) => ipcRenderer.invoke('delete-file', filePath),

    // Prompt Generator
    generateVideoPrompts: (params) => ipcRenderer.invoke('generate-video-prompts', params),

    // Prompt Generator V2
    generateCharacterBible: (params) => ipcRenderer.invoke('generate-character-bible', params),
    generateStoryboard: (params) => ipcRenderer.invoke('generate-storyboard', params),
    regenerateScene: (params) => ipcRenderer.invoke('regenerate-scene', params),

    // Prompt Generator V3 - 3 Tabs
    generateStructuredPrompts: (params) => ipcRenderer.invoke('generate-structured-prompts', params),
    generateCharacterImage: (params) => ipcRenderer.invoke('generate-character-image', params),

    // Veo3 Video Automation
    validateVeo3Cookie: (params) => ipcRenderer.invoke('validate-veo3-cookie', params),
    testVeo3Account: (params) => ipcRenderer.invoke('test-veo3-account', params),
    startVeo3Automation: (params) => ipcRenderer.invoke('start-veo3-automation', params),
    stopVeo3Automation: () => ipcRenderer.send('stop-veo3-automation'),
    onVeo3Log: (callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on('veo3:log', subscription);
        return () => ipcRenderer.removeListener('veo3:log', subscription);
    },

    // Video Merging
    mergeVideos: (params) => ipcRenderer.invoke('merge-videos', params),

    // Generic event listener (for validation-progress, etc.)
    on: (channel, callback) => {
        const subscription = (event, data) => callback(data);
        ipcRenderer.on(channel, subscription);
        return subscription;
    },
    removeListener: (channel, callback) => {
        ipcRenderer.removeListener(channel, callback);
    },

    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
