// Video Storyboard Styles (30 presets)
export const STORY_STYLES = [
    '🎨 Hoạt hình Pixar 3D (Mặc định)',
    '🎓 Lớp học THCS/THPT',
    '🔬 Phòng thí nghiệm',
    '🌳 Ngoài trời',
    '📚 Thư viện',
    '🏠 Tại nhà',
    '📐 Geometry-only',
    '✨ Hoạt hình 2D',
    '⬜ Bảng trắng',
    '✂️ Thủ công giấy',
    '🏙️ Đường phố',
    '🎬 Phim tài liệu',
    '🎭 Kịch tính',
    '🎪 Vui nhộn',
    '⚪ Tối giản',
    '📼 Cổ điển',
    '🔍 Cận cảnh',
    '🦅 Góc từ trên',
    '👁️ Góc chủ quan',
    '⬛⬜ Chia đôi màn hình',
    '⏱️ Tua nhanh',
    '👫 2 học sinh',
    '👨‍🏫 Thầy/Cô và học sinh',
    '👥 Nhóm học sinh',
    '🧑 1 học sinh',
    '🎤 Người thuyết trình',
    '☀️ Ánh sáng tự nhiên',
    '💡 Ánh sáng studio',
    '🔥 Ánh sáng ấm',
    '✨ Tùy chỉnh'
];

// Word count presets
export const VIDEO_DURATION_PRESETS = [
    { label: '⚡ Ngắn (500 từ)', value: '500', words: 500 },
    { label: '🎬 Trung bình (1000 từ)', value: '1000', words: 1000 },
    { label: '📹 Dài (1500 từ)', value: '1500', words: 1500 },
    { label: '🎞️ Rất dài (2500 từ)', value: '2500', words: 2500 },
    { label: '📺 Siêu dài (5000 từ)', value: '5000', words: 5000 }
];

// Backward compatibility
export const WORD_COUNT_PRESETS = VIDEO_DURATION_PRESETS;

// Local storage keys
export const STORAGE_KEYS = {
    API_KEY: 'veo-api-key',
    STORIES: 'veo-suite-stories',
    METADATAS: 'veo-suite-generated-metadatas'
};

// AI Models Configuration (Based on actual AI Studio quota data)
export const GEMINI_MODELS = [
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: '🏆 Quota CAO NHẤT (1,000/ngày) - Nhanh, ổn định, đầy đủ tính năng',
        tier: 'newest',
        free: {
            rpm: 15, // 15 from AI Studio screenshot
            rpd: 1000, // 1K from screenshot - HIGHEST!
            tpm: 250000 // 250K from screenshot
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Google Search'],
        contextWindow: '1M tokens',
        recommended: true // Changed to recommended due to highest quota
    },
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Hỗ trợ Thinking mode - Quota 250/ngày',
        tier: 'newest',
        free: {
            rpm: 10, // 10 from AI Studio screenshot
            rpd: 250, // 250 from screenshot
            tpm: 250000 // 250K from screenshot
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Thinking', 'Google Search'],
        contextWindow: '1M tokens',
        recommended: false
    },
    {
        id: 'gemini-2.5-pro',
        name: 'Gemini 2.5 Pro',
        description: 'Model mạnh nhất, phù hợp tác vụ reasoning phức tạp',
        tier: 'newest',
        free: {
            rpm: 2, // 2 from screenshot
            rpd: 50, // 50 from screenshot
            tpm: 125000 // 125K from screenshot
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Advanced Reasoning', 'Google Search'],
        contextWindow: '2M tokens',
        recommended: false,
        warning: 'Quota thấp (50/ngày) - dùng tiết kiệm cho tác vụ phức tạp'
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Model thế hệ 2 cân bằng, ổn định, quota tốt',
        tier: 'stable',
        free: {
            rpm: 15, // 15 from screenshot
            rpd: 200, // 200 from screenshot
            tpm: 1000000 // 1M from screenshot
        },
        paid: {
            rpm: 2000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Image Gen', 'Google Search'],
        contextWindow: '1M tokens',
        recommended: false
    },
    {
        id: 'gemini-2.0-flash-lite',
        name: 'Gemini 2.0 Flash Lite',
        description: 'Model nhỏ thế hệ 2, quota cao nhất (200/ngày)',
        tier: 'stable',
        free: {
            rpm: 30, // 30 from screenshot
            rpd: 200, // 200 from screenshot
            tpm: 1000000 // 1M from screenshot
        },
        paid: {
            rpm: 2000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio'],
        contextWindow: '1M tokens',
        recommended: false
    },
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Experimental',
        description: '⚠️ Model thử nghiệm, quota RẤT THẤP',
        tier: 'experimental',
        free: {
            rpm: 10, // 10 from screenshot
            rpd: 50, // 50 from screenshot - VERY LIMITED!
            tpm: 250000 // 250K from screenshot
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Latest Features'],
        contextWindow: '1M tokens',
        recommended: false,
        warning: 'CHỈ 50 requests/ngày! Tránh dùng cho production.'
    }
];

// Default model for the app - Changed to highest quota model
export const DEFAULT_MODEL = 'gemini-2.5-flash-lite';

// Legacy - keep for backward compatibility
export const AI_MODELS = {
    STORY_GENERATION: DEFAULT_MODEL,
    METADATA_GENERATION: DEFAULT_MODEL
};

// System instructions
export const SYSTEM_INSTRUCTIONS = {
    STORY_FROM_IDEA: 'You are an expert educational video storyboard writer, specializing in creating detailed scene-by-scene scripts for mathematics education videos. Your expertise includes cinematography, visual storytelling, and educational content design. Create 6-scene storyboards, each scene lasting 10 seconds (total ~60s). Hold final 3 seconds of each scene as a freeze frame for overlay text insertion. Write in GEOMETRY-ONLY mode: no text, formulas, or Vietnamese on-screen. Provide detailed descriptions for: characters, setting, lighting, camera angles, actions, emotions. Always write in Vietnamese, design for Vietnamese middle/high school students.',
    STORY_FROM_URL: 'You are a storyboard writer who transforms mathematical articles into detailed video scene scripts with camera angles, lighting, and character actions.',
    METADATA: 'You are an expert at creating compelling titles, descriptions, and hashtags for educational video storyboards.'
};

// Storyboard Standard Output Format
export const STORYBOARD_STANDARD = {
    HEADER_SECTIONS: [
        '🎬 CHUẨN STORYBOARD – "[Tiêu đề]"',
        '👥 Nhân vật',
        '🎨 Bối cảnh tổng thể',
        '📹 Phong cách',
        '⏱️ Tổng thời lượng'
    ],
    SCENE_COMPONENTS: [
        'Goal (Mục đích)',
        'Bối cảnh (Setting)',
        'Beat plan (Phân chia thời gian)',
        'Camera (Góc quay)',
        'Thoại (Dialogue)',
        'Cảm xúc (Emotions)',
        'Lighting (Ánh sáng)',
        'Transition (Chuyển cảnh)'
    ],
    MAIN_SCENE_DURATION: 10, // seconds
    BRIDGE_SCENE_DURATION: 3, // seconds
    MAIN_SCENES_COUNT: 6,
    BRIDGE_SCENES_COUNT: 3,
    TOTAL_DURATION_WITH_BRIDGE: 65, // seconds
    TOTAL_DURATION_WITHOUT_BRIDGE: 60 // seconds
};
