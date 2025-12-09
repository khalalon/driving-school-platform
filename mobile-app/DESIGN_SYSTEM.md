# 🎨 Design System Documentation

## Overview

Minimal, elegant design system focusing on clarity, functionality, and beautiful simplicity.

---

## Design Principles

### 1. **Minimalism**
- Remove unnecessary elements
- Focus on essential functionality
- Let content breathe with generous whitespace

### 2. **Clarity**
- Clear visual hierarchy
- Readable typography
- Obvious interactive elements

### 3. **Consistency**
- Reusable components
- Consistent spacing
- Predictable patterns

### 4. **Elegance**
- Subtle shadows and borders
- Smooth transitions
- Polished details

---

## Color Palette

### Primary (Blue)
```
50:  #EFF6FF - Lightest backgrounds
100: #DBEAFE - Light backgrounds
600: #2563EB - Primary actions
700: #1D4ED8 - Hover states
```

### Neutral (Gray)
```
50:  #FAFAFA - Page backgrounds
100: #F5F5F5 - Card backgrounds
400: #A3A3A3 - Placeholder text
600: #525252 - Secondary text
900: #171717 - Primary text
```

### Success (Green)
```
50:  #F0FDF4 - Success backgrounds
500: #10B981 - Success actions
600: #059669 - Success hover
```

### Warning (Orange)
```
50:  #FFFBEB - Warning backgrounds
500: #F59E0B - Warning actions
600: #D97706 - Warning hover
```

### Error (Red)
```
50:  #FEF2F2 - Error backgrounds
500: #EF4444 - Error actions
600: #DC2626 - Error hover
```

---

## Typography

### Font Sizes
```
xs:   12px - Captions, labels
sm:   14px - Body text, descriptions
base: 16px - Default text, inputs
lg:   18px - Subtitles
xl:   20px - Section headers
2xl:  24px - Page titles
3xl:  30px - Hero titles
4xl:  36px - Large displays
```

### Font Weights
```
normal:   400 - Body text
medium:   500 - Emphasized text
semibold: 600 - Buttons, titles
bold:     700 - Headers, important text
```

---

## Spacing

### Scale
```
xs:   4px  - Tight spacing
sm:   8px  - Small gaps
md:   12px - Medium gaps
base: 16px - Default spacing
lg:   20px - Large spacing
xl:   24px - Extra large
2xl:  32px - Section spacing
3xl:  40px - Large sections
4xl:  48px - Major sections
5xl:  64px - Hero spacing
```

---

## Components

### Buttons

**Primary Button**
- Background: `colors.primary[600]`
- Text: White
- Height: 52px
- Border Radius: 12px
- Font Weight: Semibold

**Secondary Button**
- Background: `colors.primary[50]`
- Text: `colors.primary[600]`
- Height: 52px
- Border Radius: 12px
- Font Weight: Medium

**Tertiary Button**
- Background: White
- Border: `colors.border.default`
- Text: `colors.text.primary`
- Height: 52px
- Border Radius: 12px

### Cards

**Menu Card**
- Background: White
- Border Radius: 16px
- Padding: 20px
- Shadow: Small shadow
- Icon Container:
  - Size: 56x56px
  - Border Radius: 28px
  - Colored background

**List Card**
- Background: White
- Border Radius: 12px
- Padding: 16px
- Shadow: Small shadow

### Input Fields

**Standard Input**
- Background: White
- Border: `colors.border.default`
- Border Radius: 12px
- Height: 52px
- Padding: 16px
- Icon spacing: 12px

### Icons

**Icon Sizes**
- Small: 16px
- Medium: 20px
- Large: 24px
- XL: 28px
- Display: 40px

**Icon Container**
- Background: Tinted color (e.g., `colors.primary[50]`)
- Icon: Primary color (e.g., `colors.primary[600]`)
- Border Radius: 50%

---

## Layout

### Screen Structure
```
┌─────────────────────┐
│     Header          │ - Fixed, white background
├─────────────────────┤
│                     │
│   ScrollView        │ - Light gray background
│   (Content)         │ - Horizontal padding: 24px
│                     │
└─────────────────────┘
```

### Header
- Background: White
- Padding: 24px horizontal, 40px top, 24px bottom
- Title: 2xl, bold
- Icons: 44x44px touchable area

### Content Area
- Background: `colors.background.secondary`
- Padding: 24px
- Gap between sections: 24px

---

## Shadows

### Usage
```typescript
// Subtle shadow for cards
...shadows.sm

// Medium shadow for elevated elements
...shadows.base

// Large shadow for modals
...shadows.lg
```

---

## Icon Guidelines

### Always Use Outline Style
```typescript
<Ionicons name="person-outline" /> // ✅ Good
<Ionicons name="person" />         // ❌ Avoid
```

### Common Icons
- Navigation: `arrow-back`, `arrow-forward`, `chevron-forward`
- Actions: `add-circle-outline`, `checkmark-circle`, `close-circle`
- Content: `calendar-outline`, `clipboard-outline`, `document-text-outline`
- People: `person-outline`, `people-outline`, `school-outline`
- Status: `checkmark-circle`, `time-outline`, `alert-circle-outline`

---

## States

### Interactive States
```typescript
// Normal
opacity: 1

// Pressed (activeOpacity)
opacity: 0.7

// Disabled
opacity: 0.5
backgroundColor: colors.neutral[300]
```

### Status Colors
```typescript
pending:  colors.warning[500]  // Orange
approved: colors.success[500]  // Green
rejected: colors.error[500]    // Red
```

---

## Best Practices

### ✅ Do
- Use consistent spacing from the scale
- Apply shadows to elevated elements
- Use outline icons throughout
- Maintain 44x44px minimum touch targets
- Use semantic colors (success/warning/error)

### ❌ Don't
- Mix filled and outline icon styles
- Use custom colors outside the palette
- Create tiny touch targets
- Use emojis in UI
- Overcrowd the interface

---

## Example Implementation
```typescript
import { colors, typography, spacing, shadows } from '../../theme';

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: 16,
    padding: spacing.lg,
    ...shadows.sm,
  },
  title: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.semibold,
    color: colors.text.primary,
  },
  description: {
    fontSize: typography.size.sm,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
});
```

---

## Component Checklist

When creating a new screen:
- [ ] Use theme colors (no hardcoded colors)
- [ ] Use spacing scale (no magic numbers)
- [ ] Use typography scale for text
- [ ] Apply appropriate shadows
- [ ] Use outline icons only
- [ ] 44x44px minimum touch targets
- [ ] activeOpacity={0.7} on touchables
- [ ] Consistent border radius (12-16px)

---

This design system ensures a **cohesive, elegant, and minimal** experience throughout the app. 🎨✨
