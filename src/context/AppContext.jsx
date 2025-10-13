import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within AppProvider');
    }
    return context;
};

export const AppProvider = ({ children }) => {
    const [apiKey, setApiKey] = useState('');
    const [selectedModel, setSelectedModel] = useState('gemini-1.5-flash'); // Default model
    const [stories, setStories] = useState([]);
    const [metadatas, setMetadatas] = useState([]);

    // Load data from localStorage on mount
    useEffect(() => {
        const savedApiKey = localStorage.getItem('veo-api-key');
        const savedModel = localStorage.getItem('veo-selected-model');
        const savedStories = localStorage.getItem('veo-suite-stories');
        const savedMetadatas = localStorage.getItem('veo-suite-generated-metadatas');

        if (savedApiKey) setApiKey(savedApiKey);
        if (savedModel) setSelectedModel(savedModel);
        if (savedStories) setStories(JSON.parse(savedStories));
        if (savedMetadatas) setMetadatas(JSON.parse(savedMetadatas));
    }, []);

    // Save API key to localStorage
    const saveApiKey = (key) => {
        setApiKey(key);
        localStorage.setItem('veo-api-key', key);
    };

    // Save selected model to localStorage
    const saveSelectedModel = (model) => {
        setSelectedModel(model);
        localStorage.setItem('veo-selected-model', model);
    };

    // Add story
    const addStory = (story) => {
        const newStories = [story, ...stories];
        setStories(newStories);
        localStorage.setItem('veo-suite-stories', JSON.stringify(newStories));
    };

    // Update story
    const updateStory = (id, updates) => {
        const newStories = stories.map(s =>
            s.id === id ? { ...s, ...updates } : s
        );
        setStories(newStories);
        localStorage.setItem('veo-suite-stories', JSON.stringify(newStories));
    };

    // Delete story
    const deleteStory = (id) => {
        const newStories = stories.filter(s => s.id !== id);
        setStories(newStories);
        localStorage.setItem('veo-suite-stories', JSON.stringify(newStories));

        // Also delete associated metadata
        const newMetadatas = metadatas.filter(m => m.storyId !== id);
        setMetadatas(newMetadatas);
        localStorage.setItem('veo-suite-generated-metadatas', JSON.stringify(newMetadatas));
    };

    // Add metadata
    const addMetadata = (metadata) => {
        const newMetadatas = [metadata, ...metadatas];
        setMetadatas(newMetadatas);
        localStorage.setItem('veo-suite-generated-metadatas', JSON.stringify(newMetadatas));
    };

    // Get metadata for story
    const getMetadataForStory = (storyId) => {
        return metadatas.find(m => m.storyId === storyId);
    };

    const value = {
        apiKey,
        saveApiKey,
        selectedModel,
        saveSelectedModel,
        stories,
        addStory,
        updateStory,
        deleteStory,
        metadatas,
        addMetadata,
        getMetadataForStory
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};
