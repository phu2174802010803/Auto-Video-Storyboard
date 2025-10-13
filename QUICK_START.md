# 🚀 Quick Start - GitFlow Daily Workflow

Hướng dẫn nhanh cho công việc hàng ngày với GitFlow.

## 📌 Setup Ban đầu (Chỉ làm 1 lần)

✅ **Đã hoàn thành:**
- ✅ Khởi tạo Git repository
- ✅ Tạo nhánh `main` (stable)
- ✅ Tạo nhánh `develop` (development)
- ✅ Push lên GitHub
- ✅ Tag v1.0.0

**Repository:** https://github.com/phu2174802010803/Auto-Video-Storyboard

---

## 💼 Workflow Hàng ngày

### 🎯 Scenario 1: Bắt đầu làm Feature mới

```bash
# 1. Về nhánh develop và pull code mới nhất
git checkout develop
git pull origin develop

# 2. Tạo feature branch
git checkout -b feature/ten-tinh-nang

# Ví dụ cụ thể:
git checkout -b feature/export-pdf
git checkout -b feature/add-search
git checkout -b feature/improve-ui
```

### ✍️ Scenario 2: Code và Commit

```bash
# Sau khi code xong...

# Xem thay đổi
git status

# Add files
git add .

# Commit với message rõ ràng
git commit -m "feat: add PDF export button"
git commit -m "fix: resolve crash on empty input"
git commit -m "style: improve dark mode colors"

# (Optional) Backup lên GitHub
git push origin feature/ten-tinh-nang
```

### ✅ Scenario 3: Hoàn thành Feature

```bash
# 1. Test kỹ feature
npm run dev
npm run build

# 2. Về develop
git checkout develop
git pull origin develop

# 3. Merge feature vào develop
git merge feature/ten-tinh-nang

# 4. Xóa feature branch
git branch -d feature/ten-tinh-nang

# 5. Push develop lên GitHub
git push origin develop
```

### 🔥 Scenario 4: Fix Bug Khẩn (Hotfix)

```bash
# 1. Tạo hotfix từ main
git checkout main
git pull origin main
git checkout -b hotfix/ten-bug

# 2. Fix bug và commit
# ... fix code ...
git add .
git commit -m "fix: resolve critical bug"

# 3. Merge vào main
git checkout main
git merge hotfix/ten-bug
git tag -a v1.0.1 -m "Hotfix v1.0.1"
git push origin main v1.0.1

# 4. Merge vào develop
git checkout develop
git merge hotfix/ten-bug
git push origin develop

# 5. Xóa hotfix branch
git branch -d hotfix/ten-bug
```

---

## 📋 Commands Cheat Sheet

### Kiểm tra trạng thái
```bash
git status                    # Xem file đã thay đổi
git branch                    # Xem branch hiện tại
git log --oneline            # Xem lịch sử commit
```

### Làm việc với branches
```bash
git checkout develop         # Chuyển sang develop
git checkout -b feature/abc  # Tạo branch mới
git branch -d feature/abc    # Xóa branch local
```

### Commit & Push
```bash
git add .                    # Add tất cả files
git commit -m "message"      # Commit với message
git push origin branch-name  # Push lên GitHub
git pull origin branch-name  # Pull code mới
```

---

## 🎨 Commit Message Format

### Prefix chuẩn:
- `feat:` - Feature mới
- `fix:` - Sửa bug
- `docs:` - Documentation
- `style:` - UI/CSS thay đổi
- `refactor:` - Code refactoring
- `test:` - Tests
- `chore:` - Maintenance

### Ví dụ:
```bash
✅ git commit -m "feat: add export to PDF functionality"
✅ git commit -m "fix: resolve API key validation error"
✅ git commit -m "docs: update README installation guide"
✅ git commit -m "style: improve button hover effects"

❌ git commit -m "update"
❌ git commit -m "fix bug"
❌ git commit -m "changes"
```

---

## 🌳 Branch Naming

### Format: `type/description`

```bash
✅ feature/export-pdf
✅ feature/add-search-bar
✅ feature/whisk-ai-integration
✅ hotfix/api-validation
✅ release/v1.1.0

❌ feature_export_pdf    (dùng - không dùng _)
❌ FEATURE/EXPORT        (lowercase)
❌ export-pdf            (thiếu prefix)
```

---

## 🔄 Workflow Visual

```
1. Bắt đầu feature:
   develop → feature/my-feature

2. Code & commit:
   feature/my-feature [commit, commit, commit]

3. Hoàn thành:
   feature/my-feature → develop

4. Release:
   develop → release/v1.1.0 → main (tag v1.1.0) → develop
```

---

## ⚡ Quick Reference

### Bắt đầu ngày làm việc:
```bash
git checkout develop
git pull origin develop
git checkout -b feature/today-task
```

### Kết thúc feature:
```bash
git checkout develop
git merge feature/today-task
git push origin develop
git branch -d feature/today-task
```

### Backup code (giữa chừng):
```bash
git add .
git commit -m "wip: working on feature X"
git push origin feature/my-feature
```

---

## 🆘 Common Issues

### Quên đang ở branch nào?
```bash
git branch                    # * shows current branch
```

### Code nhầm branch?
```bash
git stash                     # Save changes
git checkout correct-branch
git stash pop                 # Restore changes
```

### Muốn undo commit (chưa push)?
```bash
git reset --soft HEAD~1       # Undo but keep changes
```

### Pull bị conflict?
```bash
# 1. Git sẽ báo conflict
# 2. Mở file có conflict, tìm dấu <<<<<<< và >>>>>>>
# 3. Sửa conflict thủ công
# 4. Sau đó:
git add .
git commit -m "merge: resolve conflicts"
```

---

## 📚 Tài liệu đầy đủ

Xem chi tiết trong: **`GITFLOW_GUIDE.md`**

---

## ✅ Checklist Daily

- [ ] Pull code mới nhất từ develop
- [ ] Tạo feature branch cho task
- [ ] Code và commit thường xuyên
- [ ] Test kỹ trước khi merge
- [ ] Merge vào develop
- [ ] Push lên GitHub
- [ ] Xóa feature branch local

---

**Current Setup:**
- 🔵 Main branch: `main` (stable, v1.0.0)
- 🟢 Development branch: `develop` (active work)
- 📦 Repository: https://github.com/phu2174802010803/Auto-Video-Storyboard

**Start coding!** 🚀
