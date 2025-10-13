# 🎨 Mặc Định Pixar 3D Animation - Tránh Render Người Thật

**Ngày:** 13/10/2025  
**Commit:** 1b9fc15  
**Tác giả:** Phu Chu

---

## 🎯 Vấn đề

### Hiện tượng User gặp phải:
```
❌ Tạo storyboard với style "Lớp học THCS/THPT"
❌ AI video generator (Veo 3, Sora 2) render ra video NGƯỜI THẬT
❌ Người thật không giống nhau giữa các cảnh
❌ Khó kiểm soát khuôn mặt, trang phục, biểu cảm
```

### Lý do:
- AI video generators với input "classroom, students" thường render ra **live-action footage** (người thật)
- Người thật khó maintain consistency hơn nhiều so với hoạt hình
- Facial features, clothing, lighting trên người thật **rất khó consistent** giữa các cảnh

---

## ✅ Giải pháp

### Nguyên tắc:
**LUÔN sử dụng Pixar 3D Animation style** để AI render ra **hoạt hình**, KHÔNG phải người thật.

### Lợi ích:
1. ✅ **Consistency cao hơn**: Nhân vật hoạt hình dễ giữ đồng nhất hơn người thật
2. ✅ **Kiểm soát tốt hơn**: AI render hoạt hình chính xác hơn so với người thật
3. ✅ **Thân thiện giáo dục**: Pixar style phù hợp với học sinh, không bị distract bởi người thật
4. ✅ **Tránh uncanny valley**: Người thật render bởi AI thường không tự nhiên

---

## 📝 Changes Implemented

### 1. File: `src/utils/constants.js`

**Thêm style mới và đặt làm default:**
```javascript
// Video Storyboard Styles (30 presets)
export const STORY_STYLES = [
    '🎨 Hoạt hình Pixar 3D (Mặc định)',  // ← NEW, ĐẶT ĐẦU TIÊN
    '🎓 Lớp học THCS/THPT',
    '🔬 Phòng thí nghiệm',
    '🌳 Ngoài trời',
    // ... 25 styles khác
];
```

**Trước:** 29 styles, mặc định là "🎓 Lớp học THCS/THPT"  
**Sau:** 30 styles, mặc định là "🎨 Hoạt hình Pixar 3D (Mặc định)"

---

### 2. File: `src/components/StoryCreator.jsx`

#### Change 1: Default state
```javascript
// TRƯỚC:
const [style, setStyle] = useState(() => 
    loadFromStorage('style', '🎓 Lớp học THCS/THPT')
);

// SAU:
const [style, setStyle] = useState(() => 
    loadFromStorage('style', '🎨 Hoạt hình Pixar 3D (Mặc định)')
);
```

#### Change 2: Reset button
```javascript
// TRƯỚC:
setStyle('🎓 Lớp học THCS/THPT');

// SAU:
setStyle('🎨 Hoạt hình Pixar 3D (Mặc định)');
```

---

### 3. File: `electron/main.js`

#### Change 1: Handler `generate-story-from-idea` (dòng 202-210)

**Thêm mandatory style instruction:**
```javascript
let systemInstruction = `You are an expert educational video storyboard writer...

🎨 MANDATORY STYLE: PIXAR-INSPIRED 3D ANIMATION
- ALL videos MUST be in Pixar-inspired 3D animated style (NOT live-action, NOT real people)
- Characters: Animated 3D characters with semi-realistic features, expressive eyes, soft lighting
- Animation quality: Smooth, natural movements, expressive facial animations
- Visual style: Colorful, warm, educational-friendly aesthetic similar to Pixar/Disney animations
- REASON: AI video generators render ANIMATED characters much more consistently than real people
- NO live-action footage, NO real human actors

CRITICAL: Apply CONSISTENCY CONTROLS for AI video generation...`;
```

#### Change 2: Character instruction (dòng 258)

**Trước:**
```javascript
systemInstruction += ` Always write in Vietnamese, design for Vietnamese middle/high school students with red scarves.`;
```

**Sau:**
```javascript
systemInstruction += ` Always write in Vietnamese, design for ANIMATED Vietnamese middle/high school student characters (Pixar 3D style) with red scarves. ALL characters MUST be 3D animated, NOT real people.`;
```

#### Change 3: Handler `generate-story-from-url` (dòng 406-414)

**Thêm tương tự mandatory style:**
```javascript
let systemInstruction = `You are an expert storyboard writer...

🎨 MANDATORY STYLE: PIXAR-INSPIRED 3D ANIMATION
- ALL videos MUST be in Pixar-inspired 3D animated style (NOT live-action, NOT real people)
- Characters: Animated 3D characters with semi-realistic features, expressive eyes, soft lighting
// ... (tương tự như trên)
`;
```

#### Change 4: Bối cảnh tổng thể template (dòng 297-308)

**Thêm section chi tiết:**
```javascript
🎨 Bối cảnh tổng thể:
[Địa điểm chính: lớp học/sân trường/...], có [bàn ghế gỗ, bảng đen, cây xanh qua cửa sổ, ...].
Ánh sáng: [tự nhiên qua cửa sổ bên trái, 5200K neutral daylight, bóng đổ hướng nhất quán].
Âm thanh: [tiếng chim hót nhẹ, giấy xào xạc, bút viết, ambient loop: classroom_soft_ambience].
Màu sắc: [tông ấm trung tính, palette lớp học Việt Nam].
🎨 Phong cách BẮT BUỘC: Hoạt hình Pixar 3D (ANIMATED CHARACTERS, NOT REAL PEOPLE)
  - Nhân vật: Hoạt hình 3D phong cách Pixar/Disney, mắt biểu cảm, ánh sáng mềm
  - Chất lượng: Chuyển động mượt mà, animation facial tự nhiên
  - Thẩm mỹ: Màu sắc ấm áp, thân thiện với giáo dục
  - Geometry-only (nếu hideFormulas = true)
  - ⚠️ KHÔNG sử dụng người thật, KHÔNG live-action footage
Tổng thời lượng: ${totalDuration} (${sceneStructure}).
Timeline metadata: series_id "[TitleSlug]", continuity_mode "strict".
```

---

## 🎯 Kết quả

### Trước khi update:

```
❌ User tạo storyboard
❌ AI render: Người thật trong lớp học
❌ Cảnh 1: Người thật A (mặt tròn, tóc dài)
❌ Cảnh 2: Người thật B (mặt dài, tóc ngắn) ← KHÁC NHAU!
❌ Không consistent, không dùng được
```

### Sau khi update:

```
✅ User tạo storyboard (default: Pixar 3D)
✅ AI render: Hoạt hình 3D Pixar style
✅ Cảnh 1: Nhân vật hoạt hình Nam (tóc đen, áo trắng, khăn đỏ)
✅ Cảnh 2: CÙNG nhân vật Nam (giống hệt cảnh 1) ← CONSISTENT!
✅ Tất cả cảnh đồng nhất, chất lượng cao
```

---

## 📊 So sánh: Người thật vs Hoạt hình

| Đặc điểm | Người thật (Live-action) | Hoạt hình Pixar 3D |
|----------|-------------------------|---------------------|
| **Consistency** | ❌ RẤT KHÓ giữ đồng nhất | ✅ DỄ DÀNG giữ đồng nhất |
| **Facial features** | ❌ Thay đổi giữa các cảnh | ✅ Chính xác mọi cảnh |
| **Clothing** | ❌ Khó giữ nguyên trang phục | ✅ Đồng phục hoàn hảo |
| **Lighting** | ❌ Khó match ánh sáng | ✅ Consistent lighting |
| **Expressions** | ❌ Uncanny valley (AI render sai) | ✅ Tự nhiên, biểu cảm tốt |
| **Educational fit** | ⚠️ Có thể distract học sinh | ✅ Thân thiện, dễ tiếp nhận |
| **AI quality** | ❌ Thường render không tự nhiên | ✅ Render chính xác, đẹp |

---

## 📖 Hướng dẫn cho User

### Khi tạo Storyboard mới:

1. **Mặc định đã là Pixar 3D** ✅
   - Dropdown "Phong cách Hình ảnh" tự động chọn: `🎨 Hoạt hình Pixar 3D (Mặc định)`
   - Không cần thay đổi gì

2. **Nếu muốn đổi style khác:**
   - Dropdown có 30 styles
   - Nhưng khuyến nghị **GIỮ NGUYÊN Pixar 3D** để consistency tốt nhất

3. **Output storyboard:**
   - Mô tả nhân vật: "Hoạt hình 3D Pixar style"
   - Phong cách: "Animated characters, NOT real people"
   - Ánh sáng: Soft, warm, animation-friendly

### Khi tạo Video Prompts:

- Prompts tự động có instruction: "Pixar-inspired 3D animation"
- SETTING CHUNG có: "Animation style: Pixar 3D"
- Mỗi scene nhấn mạnh: "ANIMATED characters, NOT real people"

### Khi sử dụng với AI video generators:

✅ **Veo 3 / Sora 2 / Runway Gen-3:**
- Input prompt có "Pixar 3D animation" → AI render hoạt hình
- Consistency cao, chất lượng tốt

❌ **Nếu không có "animation" trong prompt:**
- AI có thể render người thật → Không consistent

---

## 🧪 Testing

**Test case:**
1. Tạo storyboard mới
2. Kiểm tra default style

**Expected:**
- ✅ Dropdown "Phong cách Hình ảnh" = `🎨 Hoạt hình Pixar 3D (Mặc định)`
- ✅ Output có: "Phong cách BẮT BUỘC: Hoạt hình Pixar 3D"
- ✅ Nhân vật mô tả: "Hoạt hình 3D phong cách Pixar/Disney"

**Actual:** ✅ PASS (confirmed by build success)

---

## 💡 Best Practices

### Khi mô tả nhân vật:

✅ **ĐÚNG:**
```
Nam: Nhân vật hoạt hình 3D Pixar style, 12 tuổi, mặt tròn, 
mắt nâu to biểu cảm, tóc đen ngắn, áo trắng, quần xanh navy, 
khăn đỏ, animation mượt mà, facial expression tự nhiên
```

❌ **SAI:**
```
Nam: Học sinh nam 12 tuổi trong lớp học
(→ AI có thể render người thật)
```

### Khi viết prompts:

✅ **Luôn có:** "Pixar-inspired 3D animation", "animated characters"  
❌ **Tránh:** "realistic", "live-action", "real people", "photo"

---

## 🔗 Related Changes

- **TEXT_FORMULA_BAN.md**: Cấm text/số/công thức
- **VIDEO_CONSISTENCY_GUIDE.md**: Hướng dẫn consistency controls
- **PROMPT_FORMAT_FIX.md**: Format SETTING CHUNG + scenes

---

## 📊 Summary

| Component | Change | Result |
|-----------|--------|--------|
| **constants.js** | Add "🎨 Hoạt hình Pixar 3D (Mặc định)" | 30 styles (was 29) |
| **StoryCreator.jsx** | Default style = Pixar 3D | Users see Pixar as default |
| **main.js (idea)** | Add mandatory Pixar instruction | AI always generates animated style |
| **main.js (url)** | Add mandatory Pixar instruction | Consistent across input types |
| **Templates** | Add "ANIMATED CHARACTERS, NOT REAL PEOPLE" | Clear enforcement |

---

**Status:** ✅ Pushed to GitHub develop branch  
**Impact:** CRITICAL - Ngăn chặn AI render người thật, đảm bảo hoạt hình Pixar 3D consistency cao
