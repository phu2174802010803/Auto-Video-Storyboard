// Video Storyboard Styles (29 presets)
export const STORY_STYLES = [
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
export const WORD_COUNT_PRESETS = [
    { value: '1000', label: '1000 từ' },
    { value: '2000', label: '2000 từ' },
    { value: '5000', label: '5000 từ' },
    { value: '10000', label: '10000 từ' },
    { value: '15000', label: '15000 từ' },
    { value: '20000', label: '20000 từ' }
];

// Local storage keys
export const STORAGE_KEYS = {
    API_KEY: 'veo-api-key',
    STORIES: 'veo-suite-stories',
    METADATAS: 'veo-suite-generated-metadatas'
};

// AI Models
export const AI_MODELS = {
    STORY_GENERATION: 'gemini-2.0-flash-exp',
    METADATA_GENERATION: 'gemini-2.0-flash-exp'
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
