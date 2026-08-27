# Testing Guide - AstroTrainer Changes

## Quick Start Testing

### 1. Advanced Mode - Text Input Testing

**Access:** Practice → Difficulty: Advanced → Start

**Test Cases:**
- [ ] Text input appears instead of multiple-choice buttons
- [ ] Placeholder text shows "e.g., Orion"
- [ ] Check Answer button is present
- [ ] Enter key submits the answer
- [ ] Case-insensitive validation:
  - [ ] "Orion" → Correct
  - [ ] "orion" → Correct
  - [ ] "ORION" → Correct
  - [ ] "  Orion" (with spaces) → Correct
  - [ ] "xyz" → Incorrect (with feedback showing what you entered)
- [ ] IAU boundary shows before answering (not shown before)
- [ ] After answering, constellation figure shows
- [ ] Correct/Incorrect message displays properly

### 2. Beginner Mode - Unchanged Testing

**Access:** Practice → Difficulty: Beginner → Start

**Test Cases:**
- [ ] Multiple-choice buttons appear (not text input)
- [ ] Constellation stick figure is visible
- [ ] IAU boundary is visible
- [ ] Coordinate grid is visible
- [ ] 4 answer choices shown
- [ ] Clicking a choice submits immediately
- [ ] Answer validation works as before (by constellation ID)
- [ ] Score calculation unchanged
- [ ] Post-answer reveal shows all information

### 3. Intermediate Mode - Unchanged Testing

**Access:** Practice → Difficulty: Intermediate → Start

**Test Cases:**
- [ ] Multiple-choice buttons appear
- [ ] Constellation stick figure is NOT visible
- [ ] IAU boundary is visible
- [ ] Coordinate grid is visible (can toggle)
- [ ] 4 answer choices shown
- [ ] Clicking a choice submits immediately
- [ ] Slight rotation effect applied to field
- [ ] Wider field of view (larger scale) than Beginner
- [ ] All other behaviors unchanged

### 4. IAU Image Mode Testing

**Access:** Practice → Mode: "Official IAU Images" → Start

**Test Cases:**
- [ ] Mode selector shows two buttons
- [ ] "Official IAU Images" button can be selected
- [ ] Difficulty selector hidden when IAU mode selected
- [ ] "Timed practice" and "Weak constellations" options hidden
- [ ] Info message shows: "IAU Image mode uses multiple-choice..."
- [ ] Multiple-choice buttons appear (not text input)
- [ ] Instead of sky map, see constellation image placeholder/error
- [ ] Image path shown in error: "/iau-constellations/{id}.jpg"
- [ ] 4 answer choices appear (same as Beginner/Intermediate)
- [ ] Answer validation works normally
- [ ] Post-answer reveal shows constellation information with Bayer designations

**Optional (if images added):**
- [ ] After adding JPG images to `/public/iau-constellations/`:
  - [ ] Images display correctly
  - [ ] Images stay visible until answer submitted
  - [ ] Image displays after answer (showing which was correct)

### 5. Bayer Designation Testing

**Access:** Constellation Atlas (Browse constellations)

**Test Cases:**
- [ ] "Bright stars" section shows stars with Bayer
- [ ] Format: "Betelgeuse — α Ori" (for Orion)
- [ ] Format: "Rigel — β Ori" 
- [ ] Multiple stars shown with their Bayer designations
- [ ] Only named stars show Bayer (faint stars without names don't show)

**View Individual Constellation:**
- [ ] Click "View in Sky" on constellation
- [ ] Star labels on diagram show compact format
- [ ] Labels show: "Betelgeuse (α)" format
- [ ] No overcrowding or unreadable labels
- [ ] All important stars have Bayer shown

**After Answering Practice Question:**
- [ ] Constellation Facts panel shows "Bright stars"
- [ ] Stars show: "Betelgeuse — α Ori" format
- [ ] Star information panel displays correctly
- [ ] Magnitude shown correctly

### 6. Practice Session Flow Testing

**Test Cases:**
- [ ] 10 questions per session works
- [ ] Score calculation and accumulation
- [ ] Session summary shows correct totals
- [ ] Progress tracking updates
- [ ] Can restart session
- [ ] Can switch between modes/difficulties on start screen
- [ ] Changing mode/difficulty resets session state

### 7. Regression Testing (Ensure Nothing Broke)

**Basic Navigation:**
- [ ] All pages load correctly
- [ ] No JavaScript console errors
- [ ] No missing imports or broken references

**Existing Features:**
- [ ] Progress page works
- [ ] Atlas browsing works
- [ ] Search functionality works
- [ ] Category filtering works
- [ ] Random constellation picker works
- [ ] Session results page works
- [ ] Timed practice countdown works (Beginner/Intermediate)
- [ ] Weak constellation practice works

## Visual Verification

### Colors & Styling
- Text input styling matches existing buttons
- Check Answer button matches existing button styles
- Image placeholder error message is readable
- All text labels and instructions are clear

### Responsive Design
- Desktop view (1.55fr 1fr grid columns)
- Tablet view (responsive columns)
- Mobile view (stacked layout)
- Image scaling works at all breakpoints

## Data Verification

### Bayer Symbols Correct
If Orion appears, verify:
- Betelgeuse = α (alpha)
- Rigel = β (beta)  
- Bellatrix = γ (gamma)
- Alnilam = ε (epsilon)
- Alnitak = ζ (zeta)
- Mintaka = δ (delta)

(Check against official Bayer designations - not by brightness)

### Question Generation
- All 88 constellations can appear in both modes
- Distractors are plausible (nearby, similar size)
- No duplicate answer options
- Difficulty affects question generation for constellation mode only

## Performance

- [ ] No noticeable lag when switching modes
- [ ] Text input responsive (no delay on keypress)
- [ ] Image loading is smooth (or graceful error if missing)
- [ ] UI updates immediately on answer
- [ ] Navigation between practice and other pages is smooth

## Accessibility

- [ ] Text input has proper focus state
- [ ] Buttons are keyboard accessible (Enter, Tab, etc.)
- [ ] Color contrast is sufficient
- [ ] Alt text or error messages are clear for missing images
- [ ] Screen reader friendly (ARIA labels if applicable)

## Edge Cases

- [ ] Empty text input handled (shows as incorrect)
- [ ] Very long text input handled gracefully
- [ ] Special characters in constellation names (none exist, but test punctuation handling)
- [ ] Unicode text input (should still work for ASCII constellation names)
- [ ] Rapid clicking of buttons (should debounce/prevent double-submit)
- [ ] Switching tabs during practice (should maintain state)

---

## Automated Testing Checklist (For Developers)

```javascript
// Advanced mode validation function test
normalizedInput = "  Orion  ".trim().toLowerCase()
constellationName = "Orion".toLowerCase()
assert(normalizedInput === constellationName) // PASS

// Bayer conversion test
assert(bayerToSymbol("Alp") === "α") // PASS
assert(bayerToSymbol("Bet") === "β") // PASS
assert(bayerToSymbol("Kap-1") === "κ") // PASS

// Question generation test
q = generateQuestion(QuestionType.IDENTIFY_CONSTELLATION_FROM_IMAGE)
assert(q.type === "IDENTIFY_CONSTELLATION_FROM_IMAGE") // PASS
assert(q.choices.length === 4) // PASS
assert(q.choices.some(c => c.id === q.correctAnswer)) // PASS
```

---

## Known Limitations & Future Improvements

### Current Limitations:
1. IAU images not included (licensing verification needed)
2. Image error handling is informational (shows expected path)
3. Advanced mode uses typed input only (no voice/scan option)
4. Weak constellation pool doesn't work with IAU image mode (doesn't track per-image)

### Future Enhancements:
1. Add licensed IAU constellation images
2. Multi-language constellation name support
3. Pronunciation guide for constellation names
4. Custom hints/clues mode
5. Timed practice for IAU image mode
6. Image comparison with sky map overlay
7. Bayer designation quiz mode

---

## Support & Debugging

### Common Issues:

**Text input not appearing in Advanced:**
- Check: `difficulty === "advanced"` condition
- Check: mode is "constellation" (not "iau-images")
- Check: not in revealed state yet

**Bayer symbols showing as ??:**
- Browser encoding issue (ensure UTF-8)
- Font doesn't support Greek characters
- Check browser console for rendering errors

**Images not loading:**
- Check path: `/public/iau-constellations/{id}.jpg`
- Verify file exists and is readable
- Check Network tab in DevTools for 404 errors
- Ensure JPG format (not PNG, etc.)

### Debug Mode:
Add to localStorage: `console.log(question)` to inspect question object structure

---

## Sign-Off Checklist

- [ ] All three difficulty levels work as specified
- [ ] Advanced mode text input works and validates correctly
- [ ] Bayer designations display in all appropriate places
- [ ] IAU image mode infrastructure is ready
- [ ] No existing functionality is broken
- [ ] Build completes successfully
- [ ] No console errors during testing
- [ ] Visual design is consistent
- [ ] User experience is smooth
