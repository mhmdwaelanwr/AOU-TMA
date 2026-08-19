# TMAly Website - Development Plan

## Overview
Comprehensive improvement of the TMAly (formerly AOU TMA Hub) website covering branding, login UX, navigation, language detection, admin dashboard, referral system, and backend integration.

---

## Phase 1: Branding & Service Type Updates
**Files:** `Header.tsx`, `i18n.ts`, `config.ts`, `Footer` (inline in App.tsx)

1. Change site name from "AOU TMA Hub" to "TMAly" everywhere:
   - Header brand: `<strong>AOU TMA Hub</strong>` → `<strong>TMAly</strong>`
   - Footer text: `AOU TMA Hub · نسخة المنتج` → `TMAly · نسخة المنتج`
   - i18n `footer` key
   - LoginModal (if it references the name)

2. Update service type references to show all services:
   - Stats component: show "3" for service types instead of generic
   - Hero badge: update from "10 فروع رسمية" to include service types
   - HowItWorks: mention TMA, Quiz, Assignment in step descriptions
   - i18n: update `liveFx` text to mention services

---

## Phase 2: Login Modal Redesign
**Files:** `LoginModal.tsx`, `styles.css`, `i18n.ts`

### Design Changes
- Increase modal width from `420px` to `460px`
- Add more padding/spacing between elements
- Add brand logo/icon at top
- Better visual hierarchy with section dividers
- Add "Continue as Guest" button prominently

### New Layout
```
[TMAly Logo]
Welcome back / Create account
Subtitle text

[Email field]
[Password field]
[Name field - register only]

[Error message]

[Sign In / Create Account button]

--- OR ---

[Continue as Guest] ← NEW: closes modal

--- OR ---

[Google button]

Already have account? / Don't have account?
[Sign up / Sign in link]

⚠ Guest note (smaller text)
```

### "Continue as Guest" Button
- Styled as secondary/outline button
- Calls `onClose()` to close modal
- No backend call, just UI dismissal

### i18n Updates
- Move all LoginModal translations to `i18n.ts`
- Add keys: `loginTitle`, `loginSubtitle`, `registerTitle`, `registerSubtitle`, `continueAsGuest`, `orContinueWith`, `switchToLogin`, `switchToRegister`, `guestWarning`

---

## Phase 3: Navigation Scroll-Spy & Active State
**Files:** `Header.tsx`, `App.tsx`, `styles.css`

### Scroll-Spy Implementation
- Add `IntersectionObserver` in `App.tsx` or `Header.tsx`
- Track which section is currently in view
- Update active nav chip based on visible section

### Active State
- Nav chips get `.active` class when their section is in view
- CSS: `.nav-chip.active` should have brand color background + white text
- Smooth transition on state change

### Button Click Feedback
- On click, temporarily add `.clicked` class for visual feedback
- Remove after 200ms timeout
- CSS: `.nav-chip:active` scale transform

---

## Phase 4: Language Auto-Detection
**Files:** `App.tsx`, `config.ts`

### Detection Logic (first visit only)
```typescript
function detectLanguage(): Language {
  // Check localStorage first (user override)
  const stored = localStorage.getItem('aou-lang');
  if (stored === 'ar' || stored === 'en') return stored;
  
  // Auto-detect from browser
  const browserLang = navigator.language || navigator.languages?.[0] || 'ar';
  return browserLang.startsWith('ar') ? 'ar' : 'en';
}
```

### Integration
- Update `useState<Language>` initial value to use `detectLanguage()`
- Keep existing localStorage sync for manual overrides
- On first visit: detect from `navigator.language`, save to localStorage

---

## Phase 5: Admin Dashboard - Full Course Management
**Files:** `AdminDashboard.tsx`, `backend-python/app/main.py`, `styles.css`

### New Admin Tabs/Features

#### 5a. Course CRUD (New Tab: "Manage Courses")
- **Add Course**: Modal/form with fields:
  - Course code (e.g., "TM105")
  - Course title (EN + AR)
  - Description (EN + AR)
  - Faculty (dropdown)
  - Base price (EGP)
  - Per-branch price overrides (optional)
  - On-site status (boolean)
  - Study video URL
  - Study files URLs
  - Aliases/legacy codes
  - Enable/disable toggle

- **Edit Course**: Same form, pre-filled
- **Delete Course**: Confirmation dialog
- **Bulk Actions**: Enable/disable multiple courses

#### 5b. Price Management (Enhanced "Prices" Tab)
- Edit base price per service type
- Per-branch price overrides
- Enable/disable services per branch

#### 5c. Discount Management (Enhanced "Discounts" Tab)
- CRUD for promo codes
- First-order discount toggle
- Referral credit amount setting

### Backend Endpoints (New)
```
POST   /api/admin/courses          - Create course
PUT    /api/admin/courses/{id}     - Update course
DELETE /api/admin/courses/{id}     - Delete course
GET    /api/admin/courses          - List all courses (with overrides)
POST   /api/admin/prices           - Update base prices
GET    /api/admin/prices           - Get current prices
```

---

## Phase 6: Referral System (Real Implementation)
**Files:** `Referral.tsx`, `OrderModal.tsx`, `backend-python/app/main.py`

### Current State
- Backend has full referral support (15 EGP credit per referral)
- Frontend validates codes and shows balance
- OrderModal applies referral credit at checkout

### Fixes Needed

#### 6a. Referral Credit Usage
- When user has `credit_egp > 0`, show in OrderModal as payment option
- Allow using referral balance to reduce deposit amount
- Backend endpoint: `POST /api/user/referral/use` (deduct from balance)

#### 6b. Referral Tracking
- Show referral history (who used your code)
- Backend endpoint: `GET /api/user/referral/history`

#### 6c. Guest Referral
- For guests: store referral code in URL params (`?ref=AOU-XXXXXX`)
- Auto-fill in OrderModal when coming from referral link
- Validate on order submission

---

## Phase 7: Backend Integration
**Files:** Various components, `backend-python/app/main.py`

### Complaints Component
- Currently uses `setTimeout` (fake submission)
- Connect to: `POST /api/complaints` (already exists in backend)
- Add auth token header for logged-in users

### Support Component
- WhatsApp link: update to real number
- Email link: update to real email
- Phone link: update to real number

### OrderHistory Component
- Already connected to backend
- Verify: fetch with auth token, display correctly

### Referral Component
- Already partially connected
- Add: fetch referral history from backend
- Add: show pending vs confirmed referrals

---

## Phase 8: Button Styling & Dynamic States
**Files:** `styles.css`, various components

### Nav Button Active State
```css
.nav-chip {
  transition: all 0.2s ease;
}
.nav-chip.active {
  background: var(--brand-primary);
  color: #fff;
  font-weight: 700;
}
.nav-chip:active {
  transform: scale(0.95);
}
```

### Complaint Type Buttons
- Already have `.active` class logic
- Verify CSS styling matches

### Service Type Buttons (in OrderModal)
- Already have active state
- Ensure visual feedback on click

### Payment Method Buttons
- Already have active state
- Ensure visual feedback on click

---

## Implementation Order

| Phase | Priority | Estimated Effort |
|-------|----------|------------------|
| Phase 1: Branding | High | Small |
| Phase 2: Login Modal | High | Medium |
| Phase 3: Scroll-Spy | Medium | Medium |
| Phase 4: Language Detection | Medium | Small |
| Phase 5: Admin Course Mgmt | High | Large |
| Phase 6: Referral Fixes | Medium | Medium |
| Phase 7: Backend Integration | Medium | Medium |
| Phase 8: Button Styling | Low | Small |

---

## Testing Checklist

- [ ] Login modal: all fields work, guest button closes, Google button works
- [ ] Nav buttons: highlight when section in view, click feedback
- [ ] Language: auto-detects on first visit, saves override
- [ ] Admin: can add/edit/delete courses, prices update correctly
- [ ] Referral: code validates, credit applies at checkout, referrer gets balance
- [ ] Complaints: submits to backend, shows success
- [ ] All buttons: visual feedback on click, no broken states
- [ ] Build passes with no errors
