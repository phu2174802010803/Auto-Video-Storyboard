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
    { label: '⚡ 1 phút (~60s)', value: '1', words: 500 },
    { label: '🎬 2 phút (~120s)', value: '2', words: 1000 },
    { label: '📹 3 phút (~180s)', value: '3', words: 1500 },
    { label: '🎞️ 5 phút (~300s)', value: '5', words: 2500 },
    { label: '📺 10 phút (~600s)', value: '10', words: 5000 }
];

// Backward compatibility
export const WORD_COUNT_PRESETS = VIDEO_DURATION_PRESETS;

// Local storage keys
export const STORAGE_KEYS = {
    API_KEY: 'veo-api-key',
    STORIES: 'veo-suite-stories',
    METADATAS: 'veo-suite-generated-metadatas'
};

// AI Models Configuration
export const GEMINI_MODELS = [
    {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        description: 'Model tốt nhất về giá/hiệu suất, hỗ trợ thinking, xử lý quy mô lớn',
        tier: 'newest',
        free: {
            rpm: 10, // Requests per minute
            rpd: 1500, // Requests per day
            tpm: 4000000 // Tokens per minute
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Thinking', 'Google Search'],
        contextWindow: '1M tokens',
        recommended: true
    },
    {
        id: 'gemini-2.5-flash-lite',
        name: 'Gemini 2.5 Flash Lite',
        description: 'Model nhanh nhất, tối ưu chi phí và thông lượng cao',
        tier: 'newest',
        free: {
            rpm: 10,
            rpd: 1500,
            tpm: 4000000
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Google Search'],
        contextWindow: '1M tokens',
        recommended: false
    },
    {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        description: 'Model thế hệ 2 cân bằng, phù hợp mọi tác vụ, xây dựng Agent',
        tier: 'stable',
        free: {
            rpm: 10,
            rpd: 1500,
            tpm: 4000000
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
        description: 'Model nhỏ nhất thế hệ 2, tối ưu chi phí cho quy mô lớn',
        tier: 'stable',
        free: {
            rpm: 10,
            rpd: 1500,
            tpm: 4000000
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
        id: 'gemini-1.5-flash',
        name: 'Gemini 1.5 Flash',
        description: 'Model ổn định thế hệ 1.5, phổ biến và tin cậy',
        tier: 'legacy',
        free: {
            rpm: 15,
            rpd: 1500,
            tpm: 1000000
        },
        paid: {
            rpm: 2000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Google Search'],
        contextWindow: '1M tokens',
        recommended: false
    },
    {
        id: 'gemini-1.5-flash-8b',
        name: 'Gemini 1.5 Flash-8B',
        description: 'Model nhỏ, nhanh, chi phí thấp cho khối lượng lớn',
        tier: 'legacy',
        free: {
            rpm: 15,
            rpd: 1500,
            tpm: 4000000
        },
        paid: {
            rpm: 4000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Google Search'],
        contextWindow: '1M tokens',
        recommended: false
    },
    {
        id: 'gemini-1.5-pro',
        name: 'Gemini 1.5 Pro',
        description: 'Model mạnh nhất thế hệ 1.5, phù hợp tác vụ phức tạp',
        tier: 'legacy',
        free: {
            rpm: 2,
            rpd: 50,
            tpm: 32000
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Google Search', 'Complex Reasoning'],
        contextWindow: '2M tokens',
        recommended: false
    },
    {
        id: 'gemini-2.0-flash-exp',
        name: 'Gemini 2.0 Flash Experimental',
        description: '⚠️ Model thử nghiệm, KHÔNG ổn định, quota RẤT THẤP',
        tier: 'experimental',
        free: {
            rpm: 10,
            rpd: 50, // Very limited!
            tpm: 4000000
        },
        paid: {
            rpm: 1000,
            rpd: 50000,
            tpm: 4000000
        },
        features: ['Text', 'Image', 'Video', 'Audio', 'Latest Features'],
        contextWindow: '1M tokens',
        recommended: false,
        warning: 'Chỉ 50 requests/ngày miễn phí! Không dùng cho production.'
    }
];

// Default model for the app (currently in use)
export const DEFAULT_MODEL = 'gemini-1.5-flash';

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
