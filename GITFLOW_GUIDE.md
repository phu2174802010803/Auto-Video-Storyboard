# 🌿 GitFlow Workflow Guide

Hướng dẫn chi tiết sử dụng GitFlow workflow cho dự án Auto Video Storyboard.

## 📋 Tổng quan

### Cấu trúc nhánh

```
main (production)
├── develop (phát triển)
│   ├── feature/new-feature-1
│   ├── feature/new-feature-2
│   └── feature/new-feature-3
├── release/v1.1.0
└── hotfix/urgent-bug-fix
```

### Nhánh chính

#### 🔵 `main` - Production Branch
- **Mục đích**: Chứa code ổn định, sẵn sàng production
- **Bảo vệ**: Không được commit trực tiếp
- **Merge từ**: `release/*` và `hotfix/*` branches
- **Tags**: Mỗi release được tag với version (v1.0.0, v1.1.0, etc.)

#### 🟢 `develop` - Development Branch
- **Mục đích**: Tích hợp tất cả features mới
- **Base cho**: Feature branches
- **Merge từ**: `feature/*`, `release/*`, và `hotfix/*` branches
- **Luôn ahead** của `main` với features mới

---

## 🚀 Quy trình làm việc

### 1️⃣ Phát triển Feature mới

#### Bước 1: Tạo feature branch từ develop
```bash
# Cập nhật develop về local
git checkout develop
git pull origin develop

# Tạo feature branch
git checkout -b feature/ten-tinh-nang

# Ví dụ cụ thể:
git checkout -b feature/export-pdf
git checkout -b feature/whisk-ai-integration
git checkout -b feature/multi-language-support
```

#### Bước 2: Code & commit thường xuyên
```bash
# Làm việc trên feature...
git add .
git commit -m "feat: add export PDF functionality"
git commit -m "style: improve button design"
git commit -m "fix: resolve export error"
```

**Conventional Commit Messages:**
- `feat:` - Feature mới
- `fix:` - Bug fix
- `docs:` - Documentation
- `style:` - Formatting, UI
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

#### Bước 3: Push feature branch (optional)
```bash
# Push lên GitHub để backup hoặc collaborate
git push origin feature/ten-tinh-nang
```

#### Bước 4: Hoàn thành feature - merge vào develop
```bash
# Về develop và update
git checkout develop
git pull origin develop

# Merge feature vào develop
git merge feature/ten-tinh-nang

# Xóa feature branch local
git branch -d feature/ten-tinh-nang

# Push develop lên remote
git push origin develop

# Xóa feature branch trên remote (nếu có)
git push origin --delete feature/ten-tinh-nang
```

---

### 2️⃣ Tạo Release

#### Bước 1: Tạo release branch từ develop
```bash
git checkout develop
git pull origin develop

# Tạo release branch với version mới
git checkout -b release/v1.1.0
```

#### Bước 2: Chuẩn bị release
- Test kỹ lưỡng
- Fix bugs nhỏ (nếu có)
- Update version trong package.json
- Update CHANGELOG.md

```bash
# Commit các thay đổi cuối
git add .
git commit -m "chore: prepare release v1.1.0"
```

#### Bước 3: Merge vào main
```bash
git checkout main
git pull origin main
git merge release/v1.1.0

# Tạo tag cho version
git tag -a v1.1.0 -m "Release version 1.1.0"

# Push main + tags
git push origin main
git push origin v1.1.0
```

#### Bước 4: Merge lại vào develop
```bash
git checkout develop
git merge release/v1.1.0

# Push develop
git push origin develop

# Xóa release branch
git branch -d release/v1.1.0
```

---

### 3️⃣ Hotfix (Fix bugs trên Production)

#### Bước 1: Tạo hotfix branch từ main
```bash
git checkout main
git pull origin main

# Tạo hotfix branch
git checkout -b hotfix/ten-bug

# Ví dụ:
git checkout -b hotfix/api-key-validation
git checkout -b hotfix/crash-on-export
```

#### Bước 2: Fix bug và commit
```bash
# Fix bug...
git add .
git commit -m "fix: resolve API key validation error"
```

#### Bước 3: Merge vào main
```bash
git checkout main
git merge hotfix/ten-bug

# Update patch version
git tag -a v1.0.1 -m "Hotfix v1.0.1 - Fix API validation"

# Push
git push origin main
git push origin v1.0.1
```

#### Bước 4: Merge vào develop
```bash
git checkout develop
git merge hotfix/ten-bug
git push origin develop

# Xóa hotfix branch
git branch -d hotfix/ten-bug
```

---

## 📌 Quy tắc đặt tên

### Branch Names
```bash
feature/export-to-pdf          ✅
feature/add-whisk-ai           ✅
release/v1.1.0                 ✅
hotfix/fix-crash-bug           ✅

feature_export_pdf             ❌ (dùng - thay vì _)
FEATURE/EXPORT                 ❌ (lowercase)
feature-export-pdf             ❌ (thiếu prefix)
```

### Commit Messages
```bash
feat: add PDF export functionality                    ✅
fix: resolve crash when exporting empty storyboard   ✅
docs: update README with installation guide          ✅
style: improve dark mode colors                      ✅

Added export feature                                  ❌
fixed bug                                            ❌
Update                                               ❌
```

### Tags (Semantic Versioning)
```bash
v1.0.0  - Major release
v1.1.0  - Minor (new features)
v1.1.1  - Patch (bug fixes)
```

Format: `vMAJOR.MINOR.PATCH`
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes

---

## 🔄 Commands Cheat Sheet

### Everyday Commands
```bash
# Check current branch
git branch

# Check status
git status

# See commit history
git log --oneline --graph --all

# Create new branch
git checkout -b branch-name

# Switch branch
git checkout branch-name

# Delete branch
git branch -d branch-name

# Pull latest changes
git pull origin branch-name

# Push changes
git push origin branch-name
```

### GitFlow Shortcuts
```bash
# Start new feature
git checkout develop && git pull && git checkout -b feature/my-feature

# Finish feature
git checkout develop && git merge feature/my-feature && git branch -d feature/my-feature

# Start release
git checkout develop && git pull && git checkout -b release/v1.1.0

# Finish release
git checkout main && git merge release/v1.1.0 && git tag -a v1.1.0 -m "Release v1.1.0"
git checkout develop && git merge release/v1.1.0 && git branch -d release/v1.1.0
```

---

## ⚠️ Lưu ý quan trọng

### ❌ KHÔNG được làm
1. **KHÔNG commit trực tiếp vào `main`**
   ```bash
   git checkout main
   git add .
   git commit -m "..."  # ❌ NEVER DO THIS
   ```

2. **KHÔNG merge feature vào main**
   ```bash
   git checkout main
   git merge feature/something  # ❌ WRONG
   ```

3. **KHÔNG force push lên main/develop**
   ```bash
   git push -f origin main      # ❌ DANGEROUS
   ```

### ✅ NÊN làm
1. **Luôn pull trước khi làm việc**
   ```bash
   git checkout develop
   git pull origin develop
   ```

2. **Commit thường xuyên với message rõ ràng**
   ```bash
   git commit -m "feat: add button click animation"
   ```

3. **Test kỹ trước khi merge vào develop**
   ```bash
   npm run build
   npm run electron:dev
   # Test thoroughly
   ```

4. **Xóa branch sau khi merge**
   ```bash
   git branch -d feature/completed-feature
   ```

---

## 🎯 Workflow Diagram

```
         main (v1.0.0)
           |
           |--- develop
           |      |
           |      |--- feature/export-pdf
           |      |      |
           |      |      |--- [code, commit, commit]
           |      |      |
           |      |<---- merge
           |      |
           |      |--- feature/whisk-ai
           |      |      |
           |      |      |--- [code, commit]
           |      |      |
           |      |<---- merge
           |      |
           |<---- release/v1.1.0
           |             |
           |             |--- [test, fix bugs]
           |             |
      merge <-----------|
           |
           |--- tag v1.1.0
           |
      merge -----------> develop
```

---

## 📚 Tài liệu tham khảo

- [GitFlow Original](https://nvie.com/posts/a-successful-git-branching-model/)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Semantic Versioning](https://semver.org/)

---

## 🆘 Troubleshooting

### Conflict khi merge
```bash
# Khi có conflict
git merge feature/something
# CONFLICT (content): Merge conflict in file.js

# 1. Mở file và resolve conflict
# 2. Sau khi resolve:
git add .
git commit -m "merge: resolve conflicts from feature/something"
```

### Nhầm branch
```bash
# Đang code nhầm branch, muốn move sang branch khác
git stash                          # Save changes
git checkout correct-branch
git stash pop                      # Restore changes
```

### Undo commit (chưa push)
```bash
git reset --soft HEAD~1           # Undo commit, giữ changes
git reset --hard HEAD~1           # Undo commit, xóa changes
```

---

**Last Updated:** January 2025  
**Repository:** https://github.com/phu2174802010803/Auto-Video-Storyboard
