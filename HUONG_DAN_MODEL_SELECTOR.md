# 🤖 Hướng Dẫn Sử Dụng Model Selector

## 📊 Tổng Quan Các Model

Tool hiện hỗ trợ **6 model Gemini API chính** với quota THỰC TẾ từ AI Studio (cập nhật 13/10/2025).

## 📊 Bảng So Sánh Quota THỰC TẾ

| Model | RPM | RPD | TPM | Rank |
|-------|-----|-----|-----|------|
| **🥇 Gemini 2.5 Flash Lite** | 15 | **1,000** | 250K | ⭐⭐⭐ |
| **🥈 Gemini 2.5 Flash** | 10 | 250 | 250K | ⭐⭐ |
| **🥉 Gemini 2.0 Flash** | 15 | 200 | 1M | ⭐⭐ |
| **Gemini 2.0 Flash Lite** | **30** | 200 | 1M | ⭐ |
| **Gemini 2.5 Pro** | 2 | ⚠️ 50 | 125K | ⚠️ |
| **2.0 Flash Experimental** | 10 | ❌ 50 | 250K | ❌ |

### 🆕 Thế hệ mới nhất (2.5)

#### 🥇 Gemini 2.5 Flash Lite (KHUYÊN DÙNG NHẤT!)
- **Quota miễn phí**: 
  - 15 requests/phút
  - **1,000 requests/ngày** 🏆 (CAO NHẤT!)
  - 250K tokens/phút
- **Tính năng**: Text, Image, Video, Audio, Google Search
- **Ưu điểm**: 
  - ✅ Quota cao nhất: 1,000/ngày
  - ✅ Nhanh, hiệu quả
  - ✅ Phù hợp mọi tác vụ hàng ngày
- **Phù hợp**: Dùng hàng ngày, production, khối lượng lớn

#### Gemini 2.5 Flash
- **Quota miễn phí**: 10 RPM, **250 RPD**, 250K TPM
- **Tính năng**: Text, Image, Video, Audio, Thinking, Google Search
- **Ưu điểm**: Hỗ trợ Thinking mode
- **Nhược điểm**: Quota thấp hơn Lite (chỉ 250/ngày)
- **Phù hợp**: Khi cần thinking, phân tích phức tạp

#### Gemini 2.5 Pro
- **Quota miễn phí**: ⚠️ 2 RPM, **50 RPD**, 125K TPM
- **Tính năng**: Text, Image, Video, Audio, Advanced Reasoning
- **Context Window**: 2M tokens
- **Cảnh báo**: Quota RẤT THẤP - chỉ 50/ngày!
- **Phù hợp**: Chỉ dùng cho reasoning phức tạp, tiết kiệm

---

### ✅ Thế hệ ổn định (2.0)

#### Gemini 2.0 Flash
- **Quota miễn phí**: 15 RPM, **200 RPD**, 1M TPM
- **Tính năng**: Text, Image, Video, Audio, Image Gen, Google Search
- **Phù hợp**: Production, ổn định, quota khá

#### Gemini 2.0 Flash Lite
- **Quota miễn phí**: **30 RPM** 🚀, **200 RPD**, 1M TPM
- **Tính năng**: Text, Image, Video, Audio
- **Ưu điểm**: RPM cao nhất (30/phút) - tốc độ cực nhanh!
- **Phù hợp**: Xử lý nhanh, burst requests

---

### ⚠️ Experimental (TRÁNH DÙNG!)

#### Gemini 2.0 Flash Experimental
- **Quota miễn phí**: ⛔ 10 RPM, **50 RPD** (RẤT THẤP!)
- **Tính năng**: Text, Image, Video, Audio, Latest Features
- **Cảnh báo**: 
  - ❌ KHÔNG dùng cho production
  - ❌ Chỉ 50 requests/ngày (thấp nhất!)
  - ❌ Không ổn định, có thể ngừng hoạt động
  - ✅ Chỉ test tính năng mới

---

## 🎯 Cách Chọn Model Phù Hợp

### 🥇 Dùng hàng ngày (KHUYÊN DÙNG!)
```
👉 Gemini 2.5 Flash Lite (1,000 requests/ngày)
```
- ✅ Quota CAO NHẤT: 1,000/ngày
- ✅ Đủ cho cả ngày làm việc
- ✅ Nhanh, ổn định, đầy đủ tính năng

### 🥈 Backup khi hết quota
```
2.5 Flash Lite (1,000) hết
↓
2.0 Flash (200) hoặc 2.0 Flash Lite (200, 30 RPM)
↓
2.5 Flash (250) - nếu cần Thinking
```

### 🚀 Cần tốc độ burst (nhiều requests cùng lúc)
👉 **Gemini 2.0 Flash Lite**
- **30 RPM** - cao nhất!
- Xử lý burst traffic tốt
- 200 requests/ngày

### 🧠 Cần reasoning phức tạp, phân tích sâu
👉 **Gemini 2.5 Pro**
- Context 2M tokens
- Advanced reasoning
- ⚠️ Chỉ 50/ngày - dùng tiết kiệm!

### ❌ TRÁNH DÙNG
- **Gemini 2.0 Flash Experimental**: Chỉ 50/ngày, không ổn định
- **Gemini 2.5 Pro**: Trừ khi thực sự cần reasoning phức tạp

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
**A**: **Gemini 2.5 Flash Lite** - quota cao nhất (1,000/ngày), nhanh, ổn định.

### Q: Tại sao nên tránh Experimental?
**A**: Chỉ 50 requests/ngày, không ổn định, có thể thay đổi bất cứ lúc nào.

### Q: Làm sao biết hết quota?
**A**: Tool sẽ báo lỗi "Rate limit exceeded". Check tại AI Studio usage page.

### Q: Có thể dùng nhiều model cùng lúc?
**A**: Có! Mỗi model có quota riêng. Strategy:
```
2.5 Flash Lite (1,000) → 2.5 Flash (250) → 2.0 Flash (200) → 2.0 Flash Lite (200)
Tổng: 1,650 requests/ngày!
```

### Q: Quota reset khi nào?
**A**: 12:00 AM Pacific Time (khoảng 3:00 PM giờ Việt Nam) mỗi ngày.

### Q: Free tier có giới hạn gì? (Dữ liệu thực tế)
**A**: 
- RPM: 2-30 (tùy model)
- RPD: 50-1,000 (tùy model)
- TPM: 125K-1M
- **Best: 2.5 Flash Lite (15 RPM, 1,000 RPD)**

### Q: Quota của tôi khác với bảng trên?
**A**: Quota có thể thay đổi theo:
- Tài khoản mới vs cũ
- Vùng địa lý
- Google cập nhật hệ thống
- Check quota thực tế tại: https://aistudio.google.com/usage

### Q: Nên upgrade lên Paid khi nào?
**A**: Khi:
- Cần >1,000 requests/ngày thường xuyên
- Cần rate limit cao hơn (1,000+ RPM)
- Không muốn data dùng để training
- Cần Context Caching và Batch API

---

## 🎉 Tổng Kết

Tool hiện cung cấp **6 lựa chọn model** với quota THỰC TẾ từ AI Studio:

### 🏆 Top 3 Khuyên Dùng:
1. **🥇 Gemini 2.5 Flash Lite**: 1,000/ngày - CAO NHẤT
2. **🥈 Gemini 2.5 Flash**: 250/ngày - Có Thinking mode
3. **🥉 Gemini 2.0 Flash**: 200/ngày - Ổn định, có Image Gen

### 💡 Chiến Lược Tối Ưu:
```
Dùng 2.5 Flash Lite làm chính (1,000/ngày)
↓ Hết quota
Chuyển sang 2.0 Flash hoặc 2.5 Flash (200-250/ngày)
↓ Hết cả 
Chuyển sang 2.0 Flash Lite (200/ngày, 30 RPM tốc độ cao)

TỔNG: Lên đến 1,650+ requests/ngày nếu kết hợp!
```

### ⚠️ Lưu Ý Quan Trọng:
- **Quota thực tế** có thể khác nhau tùy tài khoản
- Check quota của BẠN tại: https://aistudio.google.com/usage
- Các con số trong tool dựa trên dữ liệu thực tế ngày 13/10/2025

**Khuyến nghị**: Bắt đầu với **Gemini 2.5 Flash Lite** (⭐⭐⭐ quota cao nhất!), backup bằng các model khác.

Chúc bạn sử dụng tool hiệu quả! 🚀
