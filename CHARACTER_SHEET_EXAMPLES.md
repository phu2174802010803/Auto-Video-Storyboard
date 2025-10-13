# 🎨 Character Sheet Examples

## Ví dụ prompt để test chức năng

### 1. Cậu bé học sinh (như hình mẫu)
```
Cậu bé học sinh Việt Nam 12 tuổi, mặc áo phông sọc xanh trắng và quần short navy, ba lô màu nâu, giày thể thao trắng, tóc đen ngắn, nụ cười thân thiện, phong cách nhân vật Pixar 3D
```

**Cấu hình đề xuất:**
- 🔄 Góc nhìn toàn thân: **3** (Front, Side, Back)
- 😊 Biểu cảm: **2** (Happy, Neutral)
- 👤 Chân dung: **0**
- **Tổng: 5 ảnh** ✅ (giống hình mẫu)

---

### 2. Cô gái văn phòng
```
Cô gái văn phòng 25 tuổi, mặc vest đen thanh lịch, váy bút chì xám, giày cao gót, tóc dài buộc đuôi ngựa, kính gọng tròn, phong cách anime hiện đại
```

**Cấu hình đề xuất:**
- 🔄 Góc nhìn toàn thân: **3**
- 😊 Biểu cảm: **3** (Happy, Neutral, Serious)
- 👤 Chân dung: **1**
- **Tổng: 7 ảnh**

---

### 3. Chiến binh tương lai
```
Chiến binh khoa học viễn tưởng, áo giáp công nghệ cao màu xanh dương và bạc, mũ bảo hiểm với kính HUD, vũ khí năng lượng, phong cách cyberpunk, ánh sáng neon
```

**Cấu hình đề xuất:**
- 🔄 Góc nhìn toàn thân: **4** (Front, Side, Back, 3/4)
- 😊 Biểu cảm: **2**
- 👤 Chân dung: **1**
- **Tổng: 7 ảnh**

---

### 4. Động vật dễ thương
```
Chú chó Corgi màu vàng kem, lông mềm mại, tai vểnh, đuôi ngắn, mắt tròn xoe, lưỡi thè ra, phong cách cartoon Disney, màu sắc tươi sáng
```

**Cấu hình đề xuất:**
- 🔄 Góc nhìn toàn thân: **3**
- 😊 Biểu cảm: **4** (Happy, Neutral, Sad, Excited)
- 👤 Chân dung: **0**
- **Tổng: 7 ảnh**

---

### 5. Character phức tạp (max)
```
Phù thủy già, áo choàng tím có họa tiết sao, mũ nhọn, râu dài bạc, gậy phép với viên pha lê, túi đeo đầy vật phẩm ma thuật, phong cách fantasy art chi tiết cao
```

**Cấu hình đề xuất:**
- 🔄 Góc nhìn toàn thân: **5** (All angles)
- 😊 Biểu cảm: **3**
- 👤 Chân dung: **2**
- **Tổng: 10 ảnh** ✅ (MAX)

---

## 💡 Tips để có kết quả tốt nhất

1. **Mô tả chi tiết**: Càng nhiều chi tiết về trang phục, màu sắc, đặc điểm → nhân vật càng nhất quán
2. **Phong cách rõ ràng**: Nêu rõ phong cách art (Pixar, anime, realistic, cartoon...)
3. **Màu sắc cụ thể**: Đặc tả màu giúp AI giữ màu đồng nhất qua các góc nhìn
4. **Số lượng hợp lý**: 5-7 ảnh thường cho kết quả tốt nhất
5. **Test dần dần**: Bắt đầu với cấu hình đơn giản (3+2), sau đó tăng lên

---

## 🎯 Workflow đề xuất

1. **Viết mô tả nhân vật** (chi tiết, rõ ràng)
2. **Chọn số lượng** theo slider:
   - Ít nhất 3 góc toàn thân để thấy design hoàn chỉnh
   - 2-3 biểu cảm để thấy tính cách
   - Headshot optional (nếu cần close-up chi tiết)
3. **Kiểm tra tổng** không vượt quá 10
4. **Nhấn "Tạo Character Sheet"**
5. **Chờ 30-60 giây** (AI xử lý)
6. **Kiểm tra kết quả**:
   - Nhân vật có nhất quán không?
   - Layout có gọn gàng không?
   - Số lượng ảnh có đúng không?
7. **Tải xuống** nếu hài lòng
8. **Hoặc thử lại** với mô tả/cấu hình khác

---

## ⚠️ Lưu ý

- **Giới hạn API**: Mỗi lần tạo tốn 1 request Gemini API
- **Thời gian**: Ảnh phức tạp (nhiều views) có thể mất 60-90 giây
- **Chất lượng**: Phụ thuộc vào model Gemini và prompt quality
- **Consistency**: AI cố gắng giữ nhất quán nhưng không đảm bảo 100%

---

## 🔍 So sánh với hình mẫu của bạn

**Hình mẫu của bạn có:**
- ✅ 3 góc toàn thân (trái)
- ✅ 2 biểu cảm (phải)
- ✅ Layout gọn gàng, white background
- ✅ Nhân vật hoàn toàn nhất quán
- ✅ Tổng 5 ảnh trong 1 composition

**Cấu hình tương đương:**
```
Góc nhìn toàn thân: 3
Biểu cảm: 2
Chân dung: 0
---
Tổng: 5 ảnh
```

Đây chính là cấu hình mặc định của app! 🎉
