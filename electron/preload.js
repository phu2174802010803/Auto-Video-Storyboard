const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Story generation
    generateStoryFromIdea: (params) => ipcRenderer.invoke('generate-story-from-idea', params),
    generateStoryFromUrl: (params) => ipcRenderer.invoke('generate-story-from-url', params),
    generateMetadata: (params) => ipcRenderer.invoke('generate-metadata', params),

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

    // Prompt Generator
    generateVideoPrompts: (params) => ipcRenderer.invoke('generate-video-prompts', params),

    // Prompt Generator V2
    generateCharacterBible: (params) => ipcRenderer.invoke('generate-character-bible', params),
    generateStoryboard: (params) => ipcRenderer.invoke('generate-storyboard', params),
    regenerateScene: (params) => ipcRenderer.invoke('regenerate-scene', params),

    // Prompt Generator V3 - 3 Tabs
    generateStructuredPrompts: (params) => ipcRenderer.invoke('generate-structured-prompts', params),
    generateCharacterImage: (params) => ipcRenderer.invoke('generate-character-image', params),

    // App info
    getAppVersion: () => ipcRenderer.invoke('get-app-version')
});
