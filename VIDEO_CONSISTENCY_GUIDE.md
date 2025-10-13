# 🎯 Video Prompt Consistency Guide

## Tổng quan

Hệ thống tạo video prompts đã được nâng cấp với **4 control systems** để đảm bảo tính nhất quán cao giữa các cảnh video, tương thích với Veo 3 và Sora 2.

---

## 🧱 I. CHARACTER CONSISTENCY CONTROL

### Mục đích
Giúp nhân vật giữ nguyên khuôn mặt, kiểu tóc, trang phục giữa các cảnh/video.

### Cấu trúc trong SETTING CHUNG (Chi tiết đầy đủ)

```
Character consistency control:
  Nam:
    reference_tag: "Nam_student_grade7_consistent"
    
    age: "12 years old"
    
    facial_features:
      face_shape: "round, soft youthful features"
      eyes: "dark brown eyes, large and bright, expressive"
      nose: "small button nose"
      mouth: "wide cheerful smile, natural Vietnamese features"
      skin_tone: "light warm Vietnamese skin tone"
      distinctive_marks: "small dimple on left cheek when smiling"
    
    hair:
      style: "short neat cut, typical Vietnamese student"
      color: "black hair"
      texture: "straight, slightly thick"
      details: "neatly combed, side part"
    
    body:
      height: "average for age, around 145cm"
      build: "slim, youthful athletic build"
      posture: "confident, curious stance"
    
    outfit:
      top: "white school uniform shirt, short sleeves"
      bottom: "navy blue pants, cotton fabric"
      accessories: "red scarf tied at neck, small school badge"
      shoes: "white sneakers with navy trim"
    
    personality_expression:
      default_emotion: "cheerful, curious, engaged"
      energy_level: "high, enthusiastic student"
      signature_gesture: "raises hand when excited, points at math problems"
    
    animation_style: "Pixar-inspired 3D semi-realistic, expressive eyes, natural body language"
    
    render_instruction: "Keep this EXACT design in EVERY scene - same face proportions, same hair, same outfit, same smile, same energy"
    
  Hoa:
    reference_tag: "Hoa_student_grade7_consistent"
    
    age: "12 years old"
    
    facial_features:
      face_shape: "oval, delicate feminine features"
      eyes: "soft brown eyes, medium size, gentle expression"
      nose: "small refined nose"
      mouth: "gentle friendly smile, dimples on both sides"
      skin_tone: "light warm Vietnamese skin tone"
      distinctive_marks: "natural rosy cheeks"
    
    hair:
      style: "shoulder-length, neat student style"
      color: "black hair"
      texture: "straight, silky"
      details: "bangs covering forehead, tied with small ribbon"
    
    body:
      height: "petite for age, around 140cm"
      build: "slim, graceful posture"
      posture: "relaxed, friendly demeanor"
    
    outfit:
      top: "white school uniform shirt, short sleeves"
      bottom: "navy blue skirt, knee-length"
      accessories: "red scarf tied at neck, small school badge, hair ribbon"
      shoes: "white school shoes with navy socks"
    
    personality_expression:
      default_emotion: "gentle, thoughtful, helpful"
      energy_level: "moderate, calm confidence"
      signature_gesture: "tucks hair behind ear when thinking, gentle hand gestures"
    
    animation_style: "Pixar-inspired 3D semi-realistic, soft expressions, graceful movements"
    
    render_instruction: "Keep this EXACT design in EVERY scene - same face, same hair with bangs, same outfit, same gentle demeanor"
```

### Lợi ích
- ✅ Veo 3 / Sora 2 sẽ nhận dạng và duy trì đặc điểm nhân vật qua các cảnh
- ✅ Giảm thiểu sự khác biệt về khuôn mặt, tóc tai giữa các đoạn
- ✅ Trang phục đồng nhất xuyên suốt series

### 💡 Tối ưu hóa
**Sử dụng ảnh tham chiếu với Whisk AI:**

1. Tạo ảnh nhân vật chuẩn bằng Whisk AI
2. Upload ảnh lên cloud storage
3. Thêm link vào `reference_tag`:

```
Character consistency control:
  Nam:
    reference_tag: "Nam_THS_uniform"
    reference_image: "https://storage.example.com/characters/nam_student.jpg"
    face_embedding: fixed
    ...
```

Veo/Sora sẽ nhận dạng chính xác hơn khi có ảnh tham chiếu!

### ❓ TẠI SAO PHẢI MÔ TẢ NHÂN VẬT CHI TIẾT ĐẾN VẬY?

**Vấn đề quan trọng nhất**: AI video generators (Veo 3, Sora 2, Runway Gen-3, Pika 2.0) sẽ **tái tạo lại nhân vật từ mô tả text** trong mỗi scene. 

❌ **Nếu mô tả không đủ chi tiết**, AI sẽ "tưởng tượng" các chi tiết khác nhau → nhân vật trông khác nhau giữa các scene!

#### Ví dụ mô tả THIẾU chi tiết (SAI):
```
Nam: "học sinh nam 12 tuổi, áo trắng, quần xanh"
```
→ AI có thể tạo:
- **Scene 1**: Mặt tròn, mắt to, tóc dài
- **Scene 2**: Mặt dài, mắt nhỏ, tóc ngắn  
- **Scene 3**: Mặt vuông, mắt vừa, tóc xoăn

❓ **Tại sao?** Vì AI không biết chính xác "mặt tròn hay vuông?", "mắt to hay nhỏ?", "tóc dài hay ngắn?"

#### Ví dụ mô tả ĐẦY ĐỦ (ĐÚNG - như template trên):
```
Nam:
  age: "12 years old"
  
  facial_features:
    face_shape: "round, soft youthful features"
    eyes: "dark brown eyes, large and bright, expressive"
    nose: "small button nose"
    mouth: "wide cheerful smile, natural Vietnamese features"
    skin_tone: "light warm Vietnamese skin tone"
    distinctive_marks: "small dimple on left cheek when smiling"
  
  hair:
    style: "short neat cut, typical Vietnamese student"
    color: "black hair"
    texture: "straight, slightly thick"
    details: "neatly combed, side part"
  
  body:
    height: "average for age, around 145cm"
    build: "slim, youthful athletic build"
    posture: "confident, curious stance"
```

✅ **Kết quả**: AI sẽ tạo **cùng một khuôn mặt, cùng kiểu tóc, cùng dáng người** trong TẤT CẢ các scene!

#### 📐 Nguyên tắc vàng:
**"Mô tả chi tiết như bạn đang vẽ chân dung cho họa sĩ Pixar!"**

- Càng chi tiết → Càng đồng nhất
- Thiếu chi tiết → AI "tự sáng tạo" → Mất continuity
- Template trên đã tối ưu cho Veo 3 và Sora 2

---

## 🌅 II. ENVIRONMENT CONTROL

### Mục đích
Giữ ánh sáng, bối cảnh, vật dụng giống nhau giữa các cảnh.

### Cấu trúc trong SETTING CHUNG

```
Environment control:
  lighting_source: "left-top soft daylight"
  temperature_kelvin: 5200
  shadow_direction: "consistent across scenes"
  color_palette: "warm neutral classroom tones"
  prop_persistence: true
  background_consistency: "maintain same classroom layout and decorations"
```

### Giải thích các tham số

#### `temperature_kelvin: 5200`
- **5200K** = ánh sáng ban ngày trung tính
- **Lợi ích**: Màu sắc đồng nhất giữa các cảnh
- **Phạm vi**: 
  - 3000K = ấm (hoàng hôn)
  - 5200K = trung tính (ban ngày)
  - 6500K = lạnh (âm u)

#### `shadow_direction: "consistent"`
- Bóng đổ luôn rơi cùng hướng
- Giúp continuity tự nhiên khi cắt cảnh

#### `prop_persistence: true`
- Giữ nguyên bàn ghế, cây cối, vở
- Vật dụng không biến mất/xuất hiện đột ngột

#### `color_palette: "warm neutral"`
- Tông màu lớp học Việt Nam: ấm, trung tính
- Tránh màu quá sáng hay quá tối

---

## 🔊 III. AUDIO CONTINUITY

### Mục đích
Giữ âm thanh nền lớp học/tiếng nói tự nhiên, đồng đều âm lượng giữa các video.

### Cấu trúc trong SETTING CHUNG

```
Audio continuity:
  ambient_loop: "classroom_soft_ambience"
  crossfade_duration: 0.8s
  maintain_volume_ratio: "speech 0.85 / ambience 0.15"
  microphone_type: "lapel simulation"
  background_sounds: "subtle paper rustling, pencil writing, distant classroom"
```

### Giải thích các tham số

#### `ambient_loop: "classroom_soft_ambience"`
- Dùng chung 1 file ambience cho toàn series
- Âm thanh lớp học nhẹ nhàng, liên tục

#### `crossfade_duration: 0.8s`
- Chuyển âm mượt khi cắt clip
- 0.8 giây overlap giữa 2 cảnh
- Tránh cắt âm đột ngột

#### `maintain_volume_ratio: "speech 0.85 / ambience 0.15"`
- Giọng nói: 85% âm lượng
- Ambience: 15% âm lượng
- Đảm bảo giọng rõ, không bị lấn át

#### `microphone_type: "lapel simulation"`
- Giọng thoại ấm, gần gũi
- Như thu bằng micro cài áo thật

---

## 🔗 IV. CONTINUITY METADATA

### Mục đích
Giúp hệ thống hiểu đây là chuỗi timeline duy nhất, giữ khung hình – ánh sáng – vị trí nhân vật nhất quán.

### Cấu trúc trong SETTING CHUNG

```
Timeline metadata:
  series_id: "FractionLesson_01"
  total_scenes: 8
  continuity_mode: "strict"
```

### Cấu trúc trong MỖI SCENE

```
Continuity:
  timeline_id: "FractionLesson_01"
  scene_number: 2
  previous_scene: "Scene_1"
  next_scene: "Scene_3"
  transition_type: "soft cut"
  maintain_from_previous: "character positions, lighting angle, desk arrangement"
```

### Giải thích các tham số

#### `timeline_id`
- ID duy nhất cho toàn bộ series
- Veo/Sora hiểu các scene thuộc cùng 1 timeline

#### `previous_scene` / `next_scene`
- Liên kết scene với scene trước/sau
- Scene 1: `previous_scene: "None"`
- Scene cuối: `next_scene: "End"`

#### `transition_type`
Các loại transition:
- **soft cut**: Cắt mượt, giữ nguyên lighting
- **match action**: Cắt giữa hành động (người đứng dậy, tay chỉ, v.v.)
- **fade**: Mờ dần
- **dissolve**: Hòa tan

#### `maintain_from_previous`
Liệt kê yếu tố cần giữ nguyên từ scene trước:
- Vị trí nhân vật
- Góc ánh sáng
- Bố trí bàn ghế
- Đồ vật trên bàn

### Lợi ích
- ✅ Veo/Sora hiểu Scene 2 nối tiếp Scene 1 trong cùng mốc thời gian
- ✅ Giữ nguyên camera angle & lighting setup
- ✅ Nhân vật không "nhảy" vị trí đột ngột
- ✅ Transition mượt mà, tự nhiên

---

## 📋 Workflow sử dụng

### Bước 1: Tạo Storyboard
1. Vào tab **📚 Quản lý Storyboard**
2. Tạo storyboard mới với các scene
3. Mô tả chi tiết nhân vật, bối cảnh

### Bước 2: Generate Prompts
1. Vào tab **📝 Tạo Prompt Video**
2. Chọn storyboard vừa tạo
3. Click **🎬 Tạo Video Prompts**

### Bước 3: Kiểm tra Consistency
Prompt được tạo sẽ bao gồm:

✅ **SETTING CHUNG** với 4 control systems:
- Character consistency control
- Environment control
- Audio continuity
- Timeline metadata

✅ **Mỗi SCENE** với:
- Character consistency check
- Lighting consistency
- Continuity metadata linking

### Bước 4: Export & Sử dụng
1. Copy từng scene riêng biệt
2. Hoặc export toàn bộ file .txt
3. Paste vào Veo 3 / Sora 2 / Runway Gen-3

---

## 🎬 Ví dụ Output

### SETTING CHUNG (trích)

```
🧱 SETTING CHUNG – Thông số kỹ thuật & phong cách

Style: Cinematic Pixar-like realism kết hợp học liệu 2D/3D.

Location: Lớp học toán THCS, sáng sủa, bàn ghế gỗ, bảng trắng phía trước.

Characters:
  Nam: Học sinh nam lớp 7, áo trắng quần tây xanh, khăn quàng đỏ
  Hoa: Học sinh nữ lớp 7, áo trắng váy xanh, khăn quàng đỏ, tóc dài ngang vai
  Thầy Bắc: Giáo viên toán, áo sơ mi xanh nhạt, quần tây đen, kính gọng tròn

Character consistency control:
  Nam:
    reference_tag: "Nam_student_grade7"
    face_embedding: fixed
    outfit: "white shirt, navy pants, red scarf"
    hairstyle: "short black hair, neat student cut"
    tone: "natural warm Vietnamese skin tone"
    physical_traits: "average height, slim build, curious expression"
  
  Hoa:
    reference_tag: "Hoa_student_grade7"
    face_embedding: fixed
    outfit: "white shirt, navy skirt, red scarf"
    hairstyle: "shoulder-length black hair with bangs"
    tone: "natural warm Vietnamese skin tone"
    physical_traits: "petite, cheerful smile"
  
  ThayBac:
    reference_tag: "ThayBac_math_teacher"
    face_embedding: fixed
    outfit: "light blue shirt, dark trousers"
    hairstyle: "short black hair, neat professional"
    tone: "natural warm skin tone"
    physical_traits: "tall, confident posture, round glasses"

Environment control:
  lighting_source: "left-top soft daylight"
  temperature_kelvin: 5200
  shadow_direction: "consistent across scenes"
  color_palette: "warm neutral classroom tones"
  prop_persistence: true
  background_consistency: "maintain same classroom layout"

Audio continuity:
  ambient_loop: "classroom_soft_ambience"
  crossfade_duration: 0.8s
  maintain_volume_ratio: "speech 0.85 / ambience 0.15"
  microphone_type: "lapel simulation"

Timeline metadata:
  series_id: "FractionBasics_Lesson01"
  total_scenes: 6
  continuity_mode: "strict"
```

### SCENE 2 (trích)

```
🎞️ PROMPT – Scene 2

Goal: Nam đặt câu hỏi về phân số, Hoa giải thích

Scene description: Góc lớp học, Nam ngồi bên trái, Hoa bên phải. Sách vở toán trên bàn. Ánh sáng nhẹ từ cửa sổ bên trái.

Beat plan:
  0–3s: Nam nhìn vào vở, nhíu mày thắc mắc
  3–7s: Nam hỏi Hoa, Hoa mỉm cười giải thích
  7–10s: Hoa vẽ hình minh họa trên giấy

Camera: Mid-shot hai nhân vật, góc ngang, focus vào khuôn mặt

Lighting: Ánh sáng ban ngày từ trái-trên (5200K), bóng đổ nhẹ về phía phải

Character consistency check:
  - Nam: white shirt, navy pants, red scarf (match reference_tag: Nam_student_grade7)
  - Hoa: white shirt, navy skirt, red scarf, shoulder-length hair (match Hoa_student_grade7)

Continuity:
  timeline_id: "FractionBasics_Lesson01"
  scene_number: 2
  previous_scene: "Scene_1"
  next_scene: "Scene_3"
  transition_type: "soft cut"
  maintain_from_previous: "desk arrangement, lighting angle, character seating positions"

TTS Script:
  Nam: "Hoa ơi, mình vẫn chưa hiểu lắm về phân số này."
  Hoa: "Để mình giải thích cho bạn nhé. Phân số thực ra rất đơn giản đấy!"
```

---

## 💡 Tips sử dụng tốt nhất

### 1. Character Reference Images
- Tạo ảnh nhân vật bằng Whisk AI/MidJourney
- Upload lên Imgur/Google Drive
- Thêm link vào `reference_tag`

### 2. Lighting Consistency
- Luôn giữ `temperature_kelvin: 5200`
- Không thay đổi `lighting_source` giữa các scene
- Shadow direction phải nhất quán

### 3. Audio
- Dùng cùng 1 file ambient cho toàn bộ series
- Crossfade 0.8s giữa các cảnh
- Volume ratio: 85/15 (speech/ambient)

### 4. Timeline
- Tạo `series_id` unique cho mỗi bài học
- Liên kết `previous_scene` và `next_scene` đúng
- Chọn `transition_type` phù hợp

### 5. Props & Background
- `prop_persistence: true` giữ đồ vật
- List props cụ thể: "sách toán, vở, bút, thước"
- Background layout giữ nguyên

---

## ❓ FAQ

### Q: Tại sao cần Character consistency control?
**A:** Veo 3 và Sora 2 dễ tạo ra nhân vật khác nhau giữa các cảnh nếu không có tag nhận dạng cố định. Character consistency giúp AI hiểu đây là cùng 1 người.

### Q: temperature_kelvin là gì?
**A:** Là nhiệt độ màu của ánh sáng (đơn vị Kelvin). 5200K = ánh sáng ban ngày trung tính, giúp màu sắc đồng nhất.

### Q: Có cần ảnh tham chiếu không?
**A:** Không bắt buộc, nhưng **rất khuyến nghị**. Ảnh reference giúp Veo/Sora nhận dạng chính xác 90%+ khuôn mặt nhân vật.

### Q: Làm sao biết transition_type nào tốt?
**A:** 
- **soft cut**: Phổ biến nhất, dùng cho hầu hết trường hợp
- **match action**: Dùng khi cắt giữa hành động (đứng dậy, chỉ tay)
- **fade**: Dùng khi chuyển thời gian/địa điểm
- **dissolve**: Dùng cho montage hoặc hồi tưởng

### Q: Audio continuity có bắt buộc không?
**A:** Không bắt buộc với Veo/Sora (chúng chỉ tạo hình ảnh), nhưng hữu ích khi bạn thêm âm thanh trong post-production.

---

## 🎓 Kết luận

Với 4 control systems mới, video prompts của bạn sẽ:

✅ **Nhân vật** nhất quán 100% giữa các cảnh  
✅ **Ánh sáng & màu sắc** đồng đều  
✅ **Âm thanh** mượt mà, chuyên nghiệp  
✅ **Timeline** liên kết chặt chẽ  

→ Kết quả: Video series có tính **continuity cao**, trông như quay 1 lần duy nhất!

---

**Tài liệu này được tạo:** January 2025  
**Phiên bản:** 1.1.0  
**Tương thích:** Veo 3, Sora 2, Runway Gen-3, Pika 2.0
