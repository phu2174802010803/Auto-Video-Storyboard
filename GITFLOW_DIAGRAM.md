# 🌳 GitFlow Visual Diagram

## Current Repository Structure

```
Auto-Video-Storyboard/
│
├── main (production)              [v1.0.0] ⭐
│   └── 0c9dcc7 - Initial commit
│
└── develop (development)          [3 commits ahead] 🚀
    ├── 16eadb1 - Git setup complete
    ├── 6aedc27 - Quick start guide
    ├── 40fc00b - GitFlow guide
    └── 0c9dcc7 - Initial commit
```

---

## GitFlow Workflow Visual

### 1. Normal Feature Development Flow

```
Time →

main      ──●────────────────────────────────────●────────────→
            │                                    │
            │ v1.0.0                        v1.1.0 (merge + tag)
            │                                    │
develop     ──●────●────────────────────────●────●────────────→
               │                            │    │
               │                            │    └─ merge back
               │                            │
feature/abc    └────●─────●─────●──────────┘
                  commit commit commit  (merge)
```

**Steps:**
1. Create feature branch from `develop`
2. Work & commit on feature branch
3. Merge back to `develop`
4. Delete feature branch

---

### 2. Release Flow

```
Time →

main        ──●────────────────────────────────●──→
              │                                │
         v1.0.0                           v1.1.0 (tag)
              │                                │
              │                                ├─ merge
              │                                │
develop       ──●────────────────●─────────────●──→
                │                │             │
                │                │             └─ merge back
                │                │
release/v1.1.0  └────────────────●─────────────┘
                            (test & bug fixes)
```

**Steps:**
1. Create release branch from `develop`
2. Test & fix bugs on release branch
3. Merge to `main` + create tag
4. Merge back to `develop`
5. Delete release branch

---

### 3. Hotfix Flow

```
Time →

main         ──●────────────●───────────────●──→
               │            │               │
          v1.0.0      v1.0.1 (tag)      v1.0.2
               │            │               │
               │            ├─ merge        │
               │            │               │
hotfix/bug     └────────────●───────────────┘
                        (urgent fix)
                            │
                            └─ also merge ──→ develop
```

**Steps:**
1. Create hotfix branch from `main`
2. Fix critical bug
3. Merge to `main` + create patch tag
4. Merge to `develop`
5. Delete hotfix branch

---

## Branch Hierarchy

```
┌─────────────────────────────────────────┐
│           main (production)             │  ← Stable, tagged versions
│         ─────────────────────           │
└─────────────────────────────────────────┘
                   ↑        ↓
                merge   merge back
                   ↑        ↓
┌─────────────────────────────────────────┐
│          develop (integration)          │  ← Integration branch
│         ─────────────────────           │
└─────────────────────────────────────────┘
         ↑        ↓                ↑        ↓
      create   merge            create   merge
         ↑        ↓                ↑        ↓
┌──────────────────┐        ┌──────────────────┐
│  feature/xxx     │        │  hotfix/xxx      │
│  ──────────      │        │  ──────────      │
└──────────────────┘        └──────────────────┘
  (new features)              (urgent fixes)
         ↑        ↓
      create   merge
         ↑        ↓
┌──────────────────┐
│  release/vX.X.X  │
│  ──────────      │
└──────────────────┘
  (prepare release)
```

---

## Commit Flow Example

### Example: Adding Export PDF Feature

```
Step 1: Create feature branch
─────────────────────────────
develop
   │
   └──> feature/export-pdf (create)


Step 2: Work on feature
─────────────────────────────
feature/export-pdf
   ├──> commit: "feat: add PDF library"
   ├──> commit: "feat: add export button"
   ├──> commit: "style: improve button design"
   └──> commit: "test: add PDF export tests"


Step 3: Merge to develop
─────────────────────────────
feature/export-pdf
   │
   └──> develop (merge)
   
develop (now has all commits)
   └──> delete feature/export-pdf


Step 4: Later, create release
─────────────────────────────
develop
   └──> release/v1.1.0 (create)
   
release/v1.1.0
   ├──> test thoroughly
   ├──> commit: "fix: resolve PDF export on Windows"
   └──> ready for production


Step 5: Release to production
─────────────────────────────
release/v1.1.0
   ├──> main (merge + tag v1.1.0)
   └──> develop (merge back)
```

---

## Current State Diagram

```
GitHub: phu2174802010803/Auto-Video-Storyboard

┌─────────────────────────────────────────────────────┐
│ main (origin/main)                     v1.0.0 ⭐    │
│ ─────────────────────────────────────────────────   │
│ 0c9dcc7 - feat: initial commit                      │
└─────────────────────────────────────────────────────┘
                        ↑
                        │ (3 commits ahead)
                        │
┌─────────────────────────────────────────────────────┐
│ develop (origin/develop)               HEAD → 🚀    │
│ ─────────────────────────────────────────────────   │
│ 16eadb1 - docs: Git setup complete                  │
│ 6aedc27 - docs: Quick start guide                   │
│ 40fc00b - docs: GitFlow guide                       │
│ 0c9dcc7 - feat: initial commit                      │
└─────────────────────────────────────────────────────┘

Status: ✅ Ready for development
Next: Create feature branches from develop
```

---

## Version Timeline

```
Past                                               Future
 │                                                   │
 ├─── v1.0.0 (current on main)                     │
 │    └── Initial release                          │
 │        - Storyboard management                  │
 │        - Video prompt generation                │
 │        - History with filters                   │
 │                                                  │
 ├─── develop (current work)                       │
 │    └── Documentation added                      │
 │        - GitFlow guide                          │
 │        - Quick start                            │
 │        - Setup summary                          │
 │                                                  │
 ├─── v1.1.0 (planned)                            │
 │    └── New features                             │
 │        - TBD                                     │
 │                                                  │
 └─→ Future versions...                            │
```

---

## Branch Permissions (Recommended)

```
┌──────────────────────────────────────────────┐
│ main                                         │
│ ────                                         │
│ Protection: ✅ Enabled                        │
│   - Require PR before merge                  │
│   - Require status checks                    │
│   - No direct commits                        │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ develop                                      │
│ ────────                                     │
│ Protection: ⚠️  Optional                      │
│   - Set as default branch                    │
│   - Allow direct commits (for small team)    │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ feature/*, hotfix/*, release/*               │
│ ────────────────────────────────             │
│ Protection: ❌ Not needed                     │
│   - Temporary branches                       │
│   - Deleted after merge                      │
└──────────────────────────────────────────────┘
```

---

## Summary

**Repository:** https://github.com/phu2174802010803/Auto-Video-Storyboard

**Current Status:**
- 🔵 `main`: v1.0.0 (stable)
- 🟢 `develop`: 3 commits ahead (active)
- 📦 Total: 36 files, 8,728+ lines

**Next Steps:**
```bash
git checkout develop
git checkout -b feature/your-feature
# Start coding!
```

**Diagram updated:** January 2025
