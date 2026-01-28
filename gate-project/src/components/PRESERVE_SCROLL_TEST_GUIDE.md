# PreserveScrollContainer - Manual Test Guide

## What to Test

The `PreserveScrollContainer` component prevents auto-scrolling to the bottom when new content is added, but only if the user has scrolled away from the bottom.

## Test Scenario 1: User Scrolled to Bottom (Should Auto-Scroll)

**Expected Behavior:** Terminal scrolls to show new content naturally

**Steps:**
1. Navigate to the Admin Dashboard or Public Demo Page
2. Launch an attack on a target site
3. Let the logs fill up in the terminal
4. **Keep scrolling to the bottom** as logs arrive
5. Verify that new logs appear at the bottom and you stay at the bottom

**Result:** ✓ PASS if you stay at the bottom and new content appears
**Result:** ✗ FAIL if you don't see new content or get stuck

---

## Test Scenario 2: User Scrolled Up (Should NOT Auto-Scroll)

**Expected Behavior:** Terminal stays at your scroll position, doesn't jump to bottom

**Steps:**
1. Navigate to the Admin Dashboard or Public Demo Page
2. Launch an attack on a target site
3. Let several logs appear in the terminal
4. **Scroll to the TOP** (or middle) of the terminal
5. Keep the attack running so new logs keep coming
6. Verify that you **stay at the top/middle** and don't get forced to the bottom

**Result:** ✓ PASS if you remain at the top/middle - no forced scrolling
**Result:** ✗ FAIL if you get jumped to the bottom while scrolled up

---

## Test Scenario 3: Mixed Scrolling Behavior

**Expected Behavior:** Scrolling position changes are respected

**Steps:**
1. Launch an attack
2. Scroll to the **middle** of the terminal
3. New logs appear - verify you **stay at the middle**
4. Continue scrolling **to the bottom**
5. Verify new logs cause you to stay at the bottom
6. Scroll **back up** to the top
7. Verify you **stay at the top** with new logs arriving

**Result:** ✓ PASS if scrolling behavior matches expectations at each step
**Result:** ✗ FAIL if you get forced somewhere unexpected

---

## How It Works (Technical Details)

The component:

1. **Tracks your scroll position** - watches where you scroll to via `onScroll` handler
2. **Detects new content** - uses `MutationObserver` to see when content is added
3. **Makes intelligent decisions:**
   - If you're at the bottom (within 10px) → allows browser auto-scroll
   - If you're scrolled up → disables overflow temporarily to prevent auto-scroll

4. **Re-enables scrolling** - after DOM updates, scrolling is re-enabled naturally

---

## Files to Check

- **Component:** `src/components/PreserveScrollContainer.tsx`
- **Used in:** 
  - `src/pages/AdminDashboard.tsx` (both bot and gate terminals)
  - `src/pages/PublicDemoPage.tsx` (both bot attack and gate terminals)

---

## Debug Tips

If scrolling still seems wrong, check:

1. **Browser Console** - look for any JavaScript errors
2. **Terminal Height** - verify terminals have fixed heights (h-96, h-80)
3. **Overflow CSS** - verify containers have `overflow-y-auto` or similar
4. **Content Adding Speed** - very rapid content additions might interfere
5. **Browser** - try different browsers (Chrome, Firefox, Safari) to isolate issues

---

## Expected Behavior Summary

| Scenario | User Position | New Content Arrives | Expected Result |
|----------|---------------|-------------------|-----------------|
| At Bottom | Bottom (within 10px) | ✅ Scrolls to show new content | ✓ At bottom |
| Scrolled Up | Top/Middle | ✅ Stays at scroll position | ✓ No jump to bottom |
| Partial Scroll | 30% down | ✅ Stays at scroll position | ✓ Remains at 30% |
| Mixed | Various | ✅ Respects position each time | ✓ Behavior correct |
