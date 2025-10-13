# 🤖 Hướng Dẫn Sử Dụng Model Selector

## 📊 Tổng Quan Các Model

Tool hiện hỗ trợ **8 model Gemini API** với đầy đủ thông tin quota và tính năng.

### 🆕 Thế hệ mới nhất (2.5)

#### ⭐ Gemini 2.5 Flash (Khuyên dùng)
- **Mô tả**: Model tốt nhất về giá/hiệu suất, hỗ trợ thinking, xử lý quy mô lớn
- **Quota miễn phí**: 
  - 10 requests/phút
  - **1,500 requests/ngày** ✅
  - 4M tokens/phút
- **Tính năng**: Text, Image, Video, Audio, Thinking, Google Search
- **Phù hợp**: Mọi tác vụ, dùng hàng ngày, production

#### Gemini 2.5 Flash Lite
- **Mô tả**: Model nhanh nhất, tối ưu chi phí và thông lượng cao
- **Quota miễn phí**: 10 RPM, 1,500 RPD, 4M TPM
- **Tính năng**: Text, Image, Video, Audio, Google Search
- **Phù hợp**: Xử lý khối lượng lớn, tốc độ cao

---

### ✅ Thế hệ ổn định (2.0)

#### Gemini 2.0 Flash
- **Mô tả**: Model thế hệ 2 cân bằng, phù hợp mọi tác vụ, xây dựng Agent
- **Quota miễn phí**: 10 RPM, 1,500 RPD, 4M TPM
- **Tính năng**: Text, Image, Video, Audio, Image Generation, Google Search
- **Phù hợp**: Production, agent development, stable deployments

#### Gemini 2.0 Flash Lite
- **Mô tả**: Model nhỏ nhất thế hệ 2, tối ưu chi phí cho quy mô lớn
- **Quota miễn phí**: 10 RPM, 1,500 RPD, 4M TPM
- **Tính năng**: Text, Image, Video, Audio
- **Phù hợp**: High-volume tasks, cost optimization

---

### 📦 Thế hệ cũ (1.5) - Đã được kiểm chứng

#### Gemini 1.5 Flash (Default)
- **Mô tả**: Model ổn định thế hệ 1.5, phổ biến và tin cậy
- **Quota miễn phí**: 15 RPM, 1,500 RPD, 1M TPM
- **Tính năng**: Text, Image, Video, Audio, Google Search
- **Phù hợp**: Production-ready, widely tested, reliable

#### Gemini 1.5 Flash-8B
- **Mô tả**: Model nhỏ, nhanh, chi phí thấp cho khối lượng lớn
- **Quota miễn phí**: 15 RPM, 1,500 RPD, 4M TPM
- **Tính năng**: Text, Image, Video, Audio, Google Search
- **Phù hợp**: Bulk processing, cost-sensitive use cases

#### Gemini 1.5 Pro
- **Mô tả**: Model mạnh nhất thế hệ 1.5, phù hợp tác vụ phức tạp
- **Quota miễn phí**: ⚠️ **Chỉ 2 RPM, 50 RPD**, 32K TPM
- **Tính năng**: Text, Image, Video, Audio, Google Search, Complex Reasoning
- **Context Window**: 2M tokens (lớn nhất)
- **Phù hợp**: Phân tích phức tạp, reasoning tasks (quota thấp)

---

### ⚠️ Experimental (Không khuyên dùng cho production)

#### Gemini 2.0 Flash Experimental
- **Mô tả**: Model thử nghiệm, KHÔNG ổn định, quota RẤT THẤP
- **Quota miễn phí**: ⛔ **Chỉ 10 RPM, 50 RPD** (rất thấp!)
- **Tính năng**: Text, Image, Video, Audio, Latest Features
- **Cảnh báo**: 
  - ❌ KHÔNG dùng cho production
  - ❌ Chỉ 50 requests/ngày
  - ❌ Có thể thay đổi hoặc ngừng hoạt động bất cứ lúc nào
  - ✅ Chỉ dùng để test tính năng mới

---

## 🎯 Cách Chọn Model Phù Hợp

### Dùng hàng ngày (Khuyên dùng)
👉 **Gemini 2.5 Flash** hoặc **Gemini 1.5 Flash**
- Quota 1,500 requests/ngày - đủ cho cả ngày làm việc
- Hiệu suất tốt, ổn định
- Hỗ trợ đầy đủ tính năng

### Cần tốc độ cao, khối lượng lớn
👉 **Gemini 2.5 Flash Lite** hoặc **Gemini 1.5 Flash-8B**
- Nhanh nhất
- Chi phí thấp
- Quota cao (1,500-4,000 RPM paid tier)

### Cần reasoning phức tạp
👉 **Gemini 1.5 Pro**
- Mạnh nhất cho phân tích phức tạp
- Context window 2M tokens
- ⚠️ Nhưng quota chỉ 50/ngày - dùng tiết kiệm!

### TRÁNH dùng
❌ **Gemini 2.0 Flash Experimental**
- Chỉ 50 requests/ngày
- Không ổn định
- Có thể lỗi bất cứ lúc nào

---

## 📊 Kiểm Tra Quota Còn Lại

### Cách 1: Trong Tool
1. Click button **"ℹ️ Chi tiết"** trong Model Selector
2. Xem panel thông tin đầy đủ
3. Click **"📊 Xem Quota còn lại"**

### Cách 2: Trực tiếp AI Studio
Truy cập: https://aistudio.google.com/usage?timeRange=last-28-days&tab=rate-limit

Bạn sẽ thấy:
- ✅ Số requests đã dùng hôm nay
- ✅ Quota còn lại
- ✅ Biểu đồ sử dụng 28 ngày qua
- ✅ Rate limit breakdown theo model

---

## 💡 Tips Sử Dụng Hiệu Quả

### 1. Theo dõi quota hàng ngày
- Quota reset vào **12:00 AM Pacific Time** (~3:00 PM giờ VN)
- Nếu hết quota: đợi reset hoặc chuyển sang model khác

### 2. Chuyển đổi model linh hoạt
- Dùng **2.5 Flash** cho tác vụ thường
- Chuyển sang **1.5 Pro** khi cần phân tích sâu
- Dùng **Flash Lite** khi cần tốc độ

### 3. Tránh lãng phí quota
- ❌ KHÔNG dùng Experimental cho công việc thực
- ❌ KHÔNG spam requests liên tục
- ✅ Test với 1-2 requests trước khi chạy hàng loạt
- ✅ Lưu kết quả để tái sử dụng

### 4. Nâng cấp lên Paid nếu cần
- Nếu cần >1,500 requests/ngày
- Rate limit cao hơn nhiều (2,000-4,000 RPM)
- Truy cập: https://aistudio.google.com/api-keys
- Click "Upgrade to Paid"

---

## 🔗 Tài Liệu Tham Khảo

- 📚 **Model Documentation**: https://ai.google.dev/gemini-api/docs/models
- 💰 **Pricing**: https://ai.google.dev/pricing
- 📊 **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits
- 🔑 **API Keys**: https://aistudio.google.com/apikey
- 📈 **Usage Dashboard**: https://aistudio.google.com/usage

---

## ❓ FAQ

### Q: Model nào tốt nhất?
**A**: Gemini 2.5 Flash - cân bằng giữa tốc độ, chất lượng, và quota.

### Q: Tại sao nên tránh Experimental?
**A**: Chỉ 50 requests/ngày, không ổn định, có thể thay đổi bất cứ lúc nào.

### Q: Làm sao biết hết quota?
**A**: Tool sẽ báo lỗi "Rate limit exceeded". Check tại AI Studio usage page.

### Q: Có thể dùng nhiều model cùng lúc?
**A**: Có! Mỗi model có quota riêng. Hết model này chuyển sang model khác.

### Q: Quota reset khi nào?
**A**: 12:00 AM Pacific Time (khoảng 3:00 PM giờ Việt Nam) mỗi ngày.

### Q: Free tier có giới hạn gì?
**A**: 
- Requests per minute: 10-15 RPM
- Requests per day: 50-1,500 RPD (tùy model)
- Tokens per minute: 32K-4M TPM
- Data dùng để improve Google's products

### Q: Nên upgrade lên Paid khi nào?
**A**: Khi:
- Cần >1,500 requests/ngày thường xuyên
- Cần rate limit cao hơn (2,000+ RPM)
- Không muốn data dùng để training
- Cần Context Caching và Batch API

---

## 🎉 Tổng Kết

Tool hiện cung cấp **8 lựa chọn model** với đầy đủ thông tin:
- ✅ Quota miễn phí/trả phí
- ✅ Tính năng hỗ trợ
- ✅ Gợi ý sử dụng
- ✅ Link kiểm tra quota
- ✅ Cảnh báo model rủi ro cao

**Khuyến nghị**: Bắt đầu với **Gemini 2.5 Flash** (⭐ recommended), nếu hết quota chuyển sang **1.5 Flash** hoặc **2.0 Flash**.

Chúc bạn sử dụng tool hiệu quả! 🚀
