# 🔧 Fix: Khôi phục định dạng SETTING CHUNG + Scene cho Video Prompts

**Ngày:** 13/10/2025  
**Commit:** d3c1264  
**Tác giả:** Phu Chu

---

## 📋 Vấn đề

Chức năng **Tạo Prompt Video** bị lỗi định dạng:
- ❌ Output chỉ là JSON array đơn giản `[{scene_number, text, prompt_en, ...}]`
- ❌ Thiếu **SETTING CHUNG** (character consistency, environment, audio, timeline)
- ❌ Thiếu cấu trúc chi tiết cho từng scene (Goal, Beat plan, Camera, TTS Script, Continuity)

**Format mong muốn:**
```
🧱 SETTING CHUNG – Thông số kỹ thuật & phong cách
  - Style
  - Location
  - Characters
  - Character consistency control (DETAILED descriptions)
  - Environment control
  - Audio continuity
  - Timeline metadata

---

🎞️ PROMPT – Scene 1
  - Goal
  - Scene description
  - Characters in scene
  - Beat plan (0-3s, 3-7s, 7-10s)
  - Camera
  - Animation / Action
  - Emotion
  - Lighting
  - Continuity (timeline_id, previous_scene, next_scene)
  - TTS Script

---

🎞️ PROMPT – Scene 2
  ...
```

---

## ✅ Giải pháp

### File thay đổi: `electron/main.js`

#### Handler: `generate-video-prompts` (dòng 680-850)

**Trước (SAI):**
```javascript
const systemPrompt = `You are an expert storyboard creator...
**Output format:**
Return a JSON array of scenes:
[
  {
    "scene_number": 1,
    "text": "Full prompt...",
    "prompt_en": "...",
    ...
  }
]`;
```

**Sau (ĐÚNG):**
```javascript
const systemPrompt = `You are an expert video prompt creator...

**OUTPUT FORMAT:**

First, generate SETTING CHUNG (general settings) - generated ONCE:

🧱 SETTING CHUNG – Thông số kỹ thuật & phong cách

Character consistency control:
  [For EACH character, create DETAILED description:]
  [Character name]:
    reference_tag: "[CharacterName]_consistent"
    age: "[exact age]"
    facial_features:
      face_shape, eyes, nose, mouth, skin_tone, distinctive_marks
    hair:
      style, color, texture, details
    body:
      height, build, posture
    outfit:
      top, bottom, accessories, shoes
    personality_expression:
      default_emotion, energy_level, signature_gesture
    animation_style: "Pixar-inspired 3D semi-realistic"
    render_instruction: "Keep EXACT design in EVERY scene"

Environment control:
  lighting_source, temperature_kelvin: 5200, shadow_direction, ...

Audio continuity:
  ambient_loop, crossfade_duration: 0.8s, ...

Timeline metadata:
  series_id, total_scenes, continuity_mode: "strict"

---

Then, for EACH scene, generate:

🎞️ PROMPT – Scene [number]

Goal: [Scene purpose]
Scene description: [Context]
Characters in scene: [List with consistency references]
Beat plan:
  0–3s: [Opening]
  3–7s: [Main action]
  7–10s: [Closing]
Camera: [Angle]
Animation / Action: [Movements]
Continuity:
  timeline_id, scene_number, previous_scene, next_scene, transition_type
TTS Script:
  [Character]: "[Dialogue]"

**CRITICAL RULES:**
1. Output as formatted TEXT with emoji headers (🧱 🎞️), NOT JSON
2. Generate SETTING CHUNG only ONCE
3. Generate exactly ${numPrompts} scenes
4. Character descriptions MUST be DETAILED
5. Maintain strict consistency across all scenes
`;
```

#### Return format thay đổi:

**Trước:**
```javascript
return {
    success: true,
    prompts: validPrompts  // JSON array
};
```

**Sau:**
```javascript
return {
    success: true,
    data: text  // Raw formatted text
};
```

---

## 🎯 Kết quả

### ✅ Đã sửa:
1. Handler `generate-video-prompts` bây giờ tạo format **SETTING CHUNG + PROMPT từng cảnh**
2. Output là **formatted text** (không phải JSON array)
3. Bao gồm đầy đủ:
   - Character consistency control (detailed descriptions)
   - Environment control (lighting 5200K, shadows)
   - Audio continuity (crossfade 0.8s)
   - Timeline metadata (series_id, continuity_mode)
   - Continuity per scene (timeline_id, previous/next scene)
   - Beat plan (0-3s, 3-7s, 7-10s)
   - TTS Script

### 📊 Handlers hiện tại:

| Handler | Format | Status | Sử dụng bởi |
|---------|--------|--------|-------------|
| `generate-structured-prompts` | SETTING CHUNG + Scenes ✅ | Đúng | PromptGenerator.jsx (Tab 1) |
| `generate-video-prompts` | SETTING CHUNG + Scenes ✅ | Đã fix | (Backwards compatibility) |

### 🧪 Test:

```javascript
// UI component đã có parser sẵn:
const parseVideoPrompts = (text) => {
    // Phân tách SETTING CHUNG và các scenes
    const lines = text.split('\n');
    let settingChung = '';
    let scenes = [];
    
    // Parse 🧱 SETTING CHUNG section
    // Parse 🎞️ PROMPT – Scene [n] sections
    
    return { settingChung, scenes };
};
```

---

## 📝 Lưu ý cho User

### Khi sử dụng "Tạo Prompt Video":

1. **Chọn Storyboard** → Click "Tạo Prompt Video"
2. **Output sẽ có:**
   - 📋 **SETTING CHUNG** (1 lần duy nhất) với:
     - Character consistency control (mô tả chi tiết nhân vật)
     - Environment control (ánh sáng, màu sắc)
     - Audio continuity (âm thanh nền)
   - 🎬 **PROMPT từng cảnh** (6-10 cảnh) với:
     - Goal, Beat plan, Camera, TTS Script
     - Continuity metadata linking các scene

3. **Copy prompts:**
   - Copy từng phần (SETTING CHUNG hoặc Scene cụ thể)
   - Copy toàn bộ
   - Export ra file .txt

4. **Sử dụng với AI video generators:**
   - Veo 3, Sora 2, Runway Gen-3, Pika 2.0
   - Paste SETTING CHUNG vào system prompt
   - Paste từng Scene prompt khi tạo video

---

## 🔗 Related Commits

- **ff97a33**: docs: add detailed explanation for character descriptions
- **37c849d**: feat: add detailed character physical descriptions for consistency
- **e83df51**: docs: add comprehensive video consistency guide
- **ffcea68**: feat: enhance video prompt generation with consistency controls
- **d3c1264**: fix: restore SETTING CHUNG + scene format ← COMMIT NÀY

---

## 📚 Documentation

Chi tiết về consistency controls: xem `VIDEO_CONSISTENCY_GUIDE.md`

**Tóm tắt:**
- Character consistency: Mô tả chi tiết Pixar-level (facial features, hair, body, outfit, personality)
- Environment control: Lighting 5200K, shadow direction, prop persistence
- Audio continuity: Ambient loop, crossfade 0.8s, volume ratios
- Continuity metadata: Timeline linking, scene transitions

---

**Status:** ✅ Fixed và pushed to GitHub develop branch
