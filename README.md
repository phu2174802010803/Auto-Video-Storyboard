# 🎬 Auto Video Storyboard# 🎬 Auto Veo Video - AI Storyboard Generator



Ứng dụng desktop tự động tạo storyboard và video prompts sử dụng AI (Google Gemini) cho sản xuất video chuyên nghiệp.Ứng dụng desktop tạo storyboard video giáo dục toán học sử dụng Google Gemini AI.



## ✨ Tính năng## ✨ Tính năng



### 📝 Quản lý Storyboard- 🎬 **Tạo Storyboard từ Ý tưởng**: Chuyển đổi ý tưởng thành storyboard chi tiết

- ✅ Tạo và quản lý nhiều storyboard- 🔗 **Tạo từ URL**: Biến bài viết toán học thành kịch bản video

- ✅ Chỉnh sửa, xóa storyboard dễ dàng- 🎨 **29 Phong cách**: Lớp học, Phòng thí nghiệm, Ngoài trời, Hoạt hình 2D, v.v.

- ✅ Lưu trữ tự động vào localStorage- ⚙️ **Tùy chỉnh nâng cao**: Bridge scenes, GEOMETRY-ONLY, Continuity control

- 📚 **Quản lý Lịch sử**: Lưu trữ và tìm kiếm storyboard

### 🤖 Tạo Video Prompts với AI

- ✅ Tích hợp Google Gemini AI (gemini-2.0-flash-exp)## 🛠️ Công nghệ

- ✅ Tự động phân tích storyboard thành scenes

- ✅ Tạo prompts chi tiết cho từng cảnh- **Frontend**: React 18 + Vite

- ✅ Hiển thị Setting Chung + từng Scene riêng biệt- **Desktop**: Electron 28

- ✅ Copy từng section hoặc export toàn bộ- **AI**: Google Gemini 2.0 Flash

- **Styling**: Custom CSS với Dark Theme

### 📜 Lịch sử & Quản lý

- ✅ Lưu lịch sử tất cả prompts đã tạo## 📦 Cài đặt

- ✅ Bộ lọc theo thời gian (Hôm nay / 7 ngày / 30 ngày)

- ✅ Tải lại prompts từ lịch sử```bash

- ✅ Preview nội dung prompts# Install dependencies

npm install

### ⚙️ Cài đặt

- ✅ Quản lý Google Gemini API Key# Run in development mode

- ✅ Giao diện tối (Dark Mode)npm run electron:dev

- ✅ Thông báo Toast messages

# Build for production

## 🚀 Công nghệnpm run electron:build

```

- **Frontend**: React 18 + Vite

- **Desktop**: Electron## 🔑 Cấu hình

- **AI**: Google Gemini API

- **Styling**: CSS Variables (Dark Theme)1. Lấy API Key miễn phí tại: [Google AI Studio](https://aistudio.google.com/app/apikey)

- **State Management**: React Context API2. Mở ứng dụng và vào phần **Cài đặt**

3. Nhập API Key và lưu

## 📦 Cài đặt

## 📖 Hướng dẫn sử dụng

### Yêu cầu hệ thống

- Node.js 16+1. Lấy API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey)

- npm hoặc yarn2. Mở ứng dụng, vào **Cài đặt** và nhập API Key

3. Chọn tab **Từ Ý tưởng** hoặc **Từ URL**

### Clone repository4. Nhập nội dung và chọn tùy chọn

```bash5. Nhấn **Tạo Storyboard**

git clone https://github.com/phu2174802010803/Auto-Video-Storyboard.git6. Sao chép hoặc lưu kết quả

cd Auto-Video-Storyboard

```## 📂 Cấu trúc Project



### Cài đặt dependencies```

```bashAuto Veo Video/

npm install├── electron/           # Electron main & preload

```│   ├── main.js

│   └── preload.js

### Cấu hình API Key├── src/

1. Lấy API Key miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey)│   ├── components/    # React components

2. Mở ứng dụng và vào tab "⚙️ Cài đặt"│   │   ├── Header.jsx

3. Nhập Google Gemini API Key│   │   ├── Sidebar.jsx

4. Key được lưu tự động trong localStorage│   │   ├── StoryCreator.jsx

│   │   ├── StoryHistory.jsx

## 🎯 Sử dụng│   │   └── Settings.jsx

│   ├── context/       # React contexts

### Development mode│   │   ├── AppContext.jsx

```bash│   │   └── ToastContext.jsx

npm run dev              # Chỉ chạy React dev server│   ├── utils/         # Utilities

npm run electron:dev     # Chạy Electron app với hot reload│   │   └── constants.js

```│   ├── App.jsx

│   ├── main.jsx

### Build production│   └── index.css

```bash├── package.json

npm run build            # Build React app├── vite.config.js

npm run electron:build   # Build Electron executable└── index.html

``````



## 📁 Cấu trúc dự án



```## 📝 License

Auto-Video-Storyboard/

├── electron/              # Electron main processMIT

│   ├── main.js           # Main process & IPC handlers

│   └── preload.js        # Preload script## 👨‍💻 Author

├── src/

│   ├── components/       # React componentsCreated with ❤️ using Google Gemini AI

│   │   ├── StoryboardManager.jsx
│   │   ├── PromptGenerator.jsx
│   │   └── Settings.jsx
│   ├── context/          # React Context
│   │   ├── AppContext.jsx
│   │   └── ToastContext.jsx
│   ├── utils/            # Utilities
│   ├── App.jsx           # Main App component
│   └── main.jsx          # React entry point
├── public/               # Static assets
├── package.json
├── vite.config.js        # Vite configuration
└── README.md
```

## 🌿 GitFlow Workflow

Dự án sử dụng GitFlow standard:

### Nhánh chính
- **`main`**: Phiên bản ổn định, production-ready
- **`develop`**: Nhánh phát triển, tích hợp features

### Quy trình phát triển

#### 1. Feature mới
```bash
git checkout develop
git checkout -b feature/ten-tinh-nang
# Code...
git add .
git commit -m "feat: add new feature"
git checkout develop
git merge feature/ten-tinh-nang
git branch -d feature/ten-tinh-nang
```

#### 2. Release
```bash
git checkout develop
git checkout -b release/v1.0.0
# Test, fix bugs...
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Version 1.0.0"
git checkout develop
git merge release/v1.0.0
```

#### 3. Hotfix
```bash
git checkout main
git checkout -b hotfix/ten-bug
# Fix bug...
git checkout main
git merge hotfix/ten-bug
git checkout develop
git merge hotfix/ten-bug
```

## 📝 Changelog

### Version 1.0.0 (Initial Release)
- ✅ Quản lý storyboard cơ bản
- ✅ Tạo video prompts với Gemini AI
- ✅ Lịch sử và bộ lọc
- ✅ Cài đặt API Key
- ✅ Giao diện Dark Mode

### Features đã xóa
- ❌ **Character Image Generation** (Sẽ rebuild với Whisk AI)
  - Chi tiết xem `REMOVED_FEATURES.md`

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch từ `develop`
3. Commit với message rõ ràng
4. Push lên branch
5. Tạo Pull Request vào `develop`

## 📄 License

MIT License

## 🔗 Links

- **Repository**: https://github.com/phu2174802010803/Auto-Video-Storyboard
- **Issues**: https://github.com/phu2174802010803/Auto-Video-Storyboard/issues
- **Google Gemini API**: https://ai.google.dev/

## 👨‍💻 Author

Phú Nguyễn - [@phu2174802010803](https://github.com/phu2174802010803)

---

⭐ Nếu dự án hữu ích, hãy cho một star nhé!
