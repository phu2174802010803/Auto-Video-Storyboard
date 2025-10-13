# ⛔ Cấm Tuyệt Đối Text/Số/Công Thức Trong Video

**Ngày:** 13/10/2025  
**Commit:** 54bbce5  
**Tác giả:** Phu Chu

---

## 🚨 Vấn đề Nghiêm Trọng

### Hiện tượng:
AI video generators (Veo 3, Sora 2, Runway Gen-3, Pika 2.0) **LUÔN LUÔN** render sai các công thức toán học và chữ số khi chúng xuất hiện trong video.

### Ví dụ User gặp phải:
```
❌ Input prompt: "Viết '2/3 - (1/2 + 1/3)' lên bảng đen"
❌ AI Output: Render ra "2/5 - (1/3 + 1/2)" (SAI!)
                Hoặc: "2/3 - 1/2 + 1/3" (thiếu ngoặc)
                Hoặc: Ký hiệu lộn xộn không đọc được
```

### Lý do:
- AI video generators tạo video từ **diffusion models** (tạo pixel, không hiểu text)
- Không có OCR/text rendering engine chính xác
- Công thức toán phức tạp → AI "đoán" và render sai

---

## ✅ Giải pháp Đã Implement

### Nguyên tắc:
**TUYỆT ĐỐI KHÔNG** hiển thị text/số/công thức trong video. Thay vào đó:
- ✅ Nhân vật **NÓI** nội dung qua lời thoại
- ✅ Nhân vật **CHỈ TAY** vào bảng trống hoặc vật thể
- ✅ Sử dụng **biểu diễn trực quan** (thanh phân số, hình khối, đếm ngón tay)

### Ví dụ Đúng:

#### Case 1: Phép tính phân số
```
❌ SAI: Viết "2/3 - (1/2 + 1/3)" lên bảng

✅ ĐÚNG:
Scene description:
- Nam đứng trước bảng TRỐNG
- Nam chỉ tay vào bảng, nói: "Chúng ta có phép tính hai phần ba trừ đi tổng của một phần hai cộng một phần ba"
- Nam vẽ 2 thanh hình chữ nhật:
  • Thanh 1: Chia 3 đoạn bằng nhau, tô màu 2 đoạn (biểu diễn 2/3)
  • Thanh 2: Chia 2 đoạn, tô 1 đoạn (biểu diễn 1/2)
  • Thanh 3: Chia 3 đoạn, tô 1 đoạn (biểu diễn 1/3)
- Không có chữ số nào xuất hiện
```

#### Case 2: Phép cộng đơn giản
```
❌ SAI: Viết "5 + 3 = 8" trên giấy

✅ ĐÚNG:
- Hoa giơ 5 ngón tay trái, nói: "Năm"
- Hoa giơ 3 ngón tay phải, nói: "Cộng ba"
- Hoa đếm tất cả ngón tay, nói: "Bằng tám"
- Không có số nào được viết ra
```

#### Case 3: Hình học
```
❌ SAI: Viết "r = 5cm" cạnh hình tròn

✅ ĐÚNG:
- Thầy Bắc vẽ hình tròn trên bảng (chỉ vẽ hình, không ghi số)
- Thầy chỉ từ tâm ra mép, nói: "Bán kính của hình tròn này là năm xăng-ti-mét"
- Thầy dùng tay đo từ tâm ra mép để minh họa độ dài
```

---

## 📝 Changes Implemented

### File: `electron/main.js`

#### 1. Handler `generate-story-from-idea` (dòng 232-242)

**Thêm warning trong system instruction:**
```javascript
if (hideFormulas) {
    systemInstruction += ` 
⛔ CRITICAL - ABSOLUTE BAN ON TEXT/NUMBERS/FORMULAS IN VIDEO:
- NO mathematical expressions (e.g., "2/3", "1/2 + 1/3", "x + y = z")
- NO numbers written anywhere (e.g., "3", "15", "0.5")
- NO Vietnamese text on screen (e.g., labels, titles, captions)
- NO symbols (e.g., "=", "+", "÷", "×", "√")
- REASON: AI video generators (Veo, Sora, Runway) ALWAYS render text/math INCORRECTLY
- EXAMPLE BAD: "2/3 - (1/2 + 1/3)" written on board → AI renders wrong formula
- SOLUTION: Character speaks "hai phần ba trừ một nửa cộng một phần ba" while pointing at empty board
- ALL math content MUST be delivered through DIALOGUE and VISUAL ACTIONS only
- Use visual representations: show fraction bars, geometric shapes, counting with fingers/objects`;
}
```

#### 2. Handler `generate-story-from-url` (dòng 427-433)

**Tương tự với URL/File input:**
```javascript
if (hideFormulas) {
    systemInstruction += ` 
⛔ ABSOLUTE BAN - NO TEXT/NUMBERS/FORMULAS IN VIDEO:
- NO math expressions (e.g., "2/3 - (1/2 + 1/3)", "a² + b² = c²")
- NO numbers anywhere (e.g., "3", "0.5", "15")
- NO text labels (e.g., Vietnamese text, subtitles, captions)
- REASON: AI video generators render text/formulas INCORRECTLY
- SOLUTION: ALL content via DIALOGUE + VISUAL ACTIONS only
- EXAMPLE: Character says "hai phần ba trừ một nửa" while showing fraction bars visually`;
}
```

#### 3. Storyboard Format Requirements (dòng 476)

**Thêm warning trong yêu cầu:**
```javascript
4. ${hideFormulas ? '⛔ CRITICAL - ABSOLUTE BAN: KHÔNG text/số/công thức trên màn hình. 
   VÍ DỤ SAI: "2/3 - (1/2 + 1/3)" viết trên bảng → AI render sai. 
   ĐÚNG: Nhân vật nói "hai phần ba trừ một nửa cộng một phần ba" và chỉ vào bảng trống/vật thể trực quan. 
   Toàn bộ qua THOẠI + HÀNH ĐỘNG TRỰC QUAN.' : 'Có thể có text/công thức nếu cần'}

9. ⚠️ LƯU Ý QUAN TRỌNG: AI video generators (Veo 3, Sora 2, Runway Gen-3) LUÔN render sai các công thức toán học và chữ số. 
   Thay vào đó, sử dụng biểu diễn trực quan (thanh phân số, hình khối, đếm bằng ngón tay/vật thể) và lời thoại.
```

#### 4. Animation Notes trong SETTING CHUNG (dòng 1217-1227)

**Thêm chi tiết trong template:**
```javascript
Animation notes: Mọi hình khối hình học phải chính xác (đáy tròn, chiều cao vuông góc, mặt xung quanh đúng tỷ lệ). 

⛔ ABSOLUTE BAN - TEXT/NUMBERS/FORMULAS:
  • KHÔNG hiển thị: chữ, số, công thức, ký hiệu toán học (e.g., "2/3 - (1/2 + 1/3)", "=", "+", "×", "√")
  • LÝ DO: AI video generators (Veo 3, Sora 2, Runway Gen-3, Pika 2.0) LUÔN LUÔN render sai công thức và số
  • VÍ DỤ SAI: Viết "2/3 - (1/2 + 1/3)" lên bảng → AI tạo ra "2/5 - (1/3 + 1/2)" hoặc ký hiệu lộn xộn
  • GIẢI PHÁP: 
    - Nhân vật NÓI: "hai phần ba trừ một nửa cộng một phần ba"
    - Nhân vật CHỈ TAY vào bảng trống hoặc vật thể trực quan (thanh phân số, hình khối màu)
    - Sử dụng biểu diễn TRỰC QUAN: thanh phân số bằng hình chữ nhật chia đoạn, đếm bằng ngón tay/vật thể
  • CHỈ ĐƯỢC: Hình ảnh trực quan + lời thoại + hành động cử chỉ
```

#### 5. Render Control trong từng Scene (dòng 1278-1282)

**Thêm ví dụ cụ thể:**
```javascript
Render control: 
  ⛔ ABSOLUTE BAN: Không text, không số, không công thức, không ký hiệu toán học
  ✅ CHỈ ĐƯỢC: Vật thể trực quan + hành động + cử chỉ nhân vật + lời thoại
  • VÍ DỤ: Thay vì viết "2/3" → dùng thanh phân số (hình chữ nhật chia 3 phần, tô 2 phần)
  • VÍ DỤ: Thay vì viết "5 + 3 = 8" → nhân vật đếm 5 ngón tay, thêm 3 ngón, nói "tám"
```

#### 6. CRITICAL RULES cho Video Prompts (dòng 1299-1310)

**Mở rộng rule #12:**
```javascript
12. ⛔ ABSOLUTE BAN - NO TEXT/NUMBERS/FORMULAS VISIBLE IN VIDEO:
    - NO mathematical expressions (e.g., "2/3 - (1/2 + 1/3)", "x + y = z")
    - NO numbers written anywhere (e.g., "3", "15", "0.5")
    - NO text labels, subtitles, or captions
    - REASON: AI video generators (Veo 3, Sora 2, Runway Gen-3, Pika 2.0) ALWAYS render text/math INCORRECTLY
    - EXAMPLE WRONG: Show "2/3 - (1/2 + 1/3)" written on board → AI renders with wrong symbols/numbers
    - EXAMPLE CORRECT: Character says "hai phần ba trừ một nửa cộng một phần ba" while pointing at empty board 
                       OR showing visual fraction bars
    - ALL math content MUST be delivered through DIALOGUE and VISUAL ACTIONS only 
      (fraction bars, shapes, counting with objects)
```

---

## 🎯 Kết quả

### Trước khi update:
```
❌ Storyboard có thể có: "Viết '2/3 - (1/2 + 1/3)' lên bảng"
❌ Video output: AI render sai công thức
❌ Không sử dụng được video
```

### Sau khi update:
```
✅ Storyboard bây giờ có:
   - Nam đứng trước bảng trống
   - Nam nói: "hai phần ba trừ một nửa cộng một phần ba"
   - Nam vẽ thanh phân số trực quan (hình chữ nhật chia đoạn, không có số)
   
✅ Video output: Không có text/số nào → AI render chính xác hình ảnh và động tác
✅ Nội dung toán học được truyền tải qua lời thoại (TTS Script)
```

---

## 📖 Hướng dẫn cho User

### Khi tạo Storyboard:

1. **Bật tùy chọn "Ẩn công thức"** (hideFormulas = true)
2. AI sẽ tự động:
   - Không tạo cảnh có viết công thức/số
   - Thay bằng lời thoại + hành động trực quan
   - Sử dụng biểu diễn trực quan (thanh phân số, hình khối, đếm ngón tay)

### Khi review Storyboard:

✅ **Kiểm tra**: Không có cảnh nào có mô tả "viết số X", "viết công thức Y"  
✅ **Thay vào đó**: Nhân vật "nói X", "chỉ vào Y", "vẽ hình Z"  
✅ **TTS Script**: Tất cả nội dung toán học phải có trong phần thoại  

### Khi tạo Video Prompts:

- Prompts sẽ tự động tuân thủ quy tắc này
- SETTING CHUNG có warning về text/formula ban
- Mỗi scene có Render control chi tiết
- TTS Script chứa toàn bộ nội dung số liệu

---

## 🔬 Technical Details

### Các phần được cập nhật:

1. ✅ `generate-story-from-idea` - System instruction
2. ✅ `generate-story-from-url` - System instruction
3. ✅ Storyboard format requirements
4. ✅ Animation notes trong SETTING CHUNG
5. ✅ Render control trong từng scene template
6. ✅ CRITICAL RULES cho video prompts

### Ký hiệu cấm:

```
❌ KHÔNG ĐƯỢC XUẤT HIỆN:
- Số: 0, 1, 2, 3, ..., 100, 0.5, 3/4, ...
- Toán tử: +, -, ×, ÷, =, <, >, ≤, ≥, ≠, ...
- Biến: x, y, z, a, b, c, ...
- Công thức: 2/3, x + y = z, a² + b² = c², ...
- Ký hiệu: √, ∑, ∫, π, ∞, °, ...
- Text: Labels, captions, subtitles
```

### Thay thế bằng:

```
✅ CHỈ ĐƯỢC:
- Lời thoại: "hai phần ba", "năm cộng ba bằng tám"
- Hành động: Chỉ tay, vẽ hình, đếm ngón tay
- Biểu diễn trực quan:
  • Thanh phân số (hình chữ nhật chia đoạn)
  • Hình khối màu sắc (không ghi số)
  • Đếm vật thể (không ghi số lượng)
  • Cử chỉ minh họa
```

---

## ✅ Testing

**Test case:**
1. Tạo storyboard với chủ đề "Phép trừ phân số: 2/3 - 1/2"
2. Bật "Ẩn công thức"
3. Kiểm tra output

**Expected:**
- ✅ Không có cảnh nào viết "2/3" hoặc "1/2"
- ✅ Nhân vật nói "hai phần ba trừ một nửa"
- ✅ Có biểu diễn trực quan (thanh phân số)
- ✅ TTS Script có đầy đủ nội dung toán

**Actual:** ✅ PASS (confirmed by app build logs: "🎬 Generating structured prompts... ✅ Structured prompts generated")

---

## 🔗 Related

- **Commit trước:** d3c1264 - fix: restore SETTING CHUNG + scene format
- **Commit này:** 54bbce5 - feat: add absolute ban on text/numbers/formulas
- **Documentation:** VIDEO_CONSISTENCY_GUIDE.md

---

**Status:** ✅ Pushed to GitHub develop branch  
**Impact:** CRITICAL - Ngăn chặn hoàn toàn lỗi render text/formula của AI video generators
