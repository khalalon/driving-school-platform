# 🎨 Minimal Design System - Complete Guide

## Overview

This guide documents the complete minimal design system implemented across the driving school management app. Every screen follows consistent patterns for a cohesive, elegant experience.

---

## Design Philosophy

### Core Principles

1. **Minimalism First**
   - Remove everything unnecessary
   - Let content breathe
   - Focus user attention

2. **Clarity Over Decoration**
   - Clear visual hierarchy
   - Obvious interaction patterns
   - Readable at a glance

3. **Consistency Always**
   - Same patterns everywhere
   - Predictable behavior
   - Muscle memory friendly

4. **Elegance in Details**
   - Subtle transitions
   - Proper spacing
   - Polished feel

---

## Component Library

### Buttons

#### Primary Button
```typescript
<TouchableOpacity
  style={styles.primaryButton}
  onPress={handleAction}
  activeOpacity={0.8}
>
  <Text style={styles.primaryButtonText}>Action</Text>
  <Ionicons name="arrow-forward" size={20} color={colors.text.inverse} />
</TouchableOpacity>

// Styles
primaryButton: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: colors.primary[600],
  borderRadius: 12,
  height: 52,
  gap: spacing.sm,
  ...shadows.sm,
}
```

#### Secondary Button
```typescript
secondaryButton: {
  backgroundColor: colors.primary[50],
  // Same structure as primary
}
```

#### Tertiary Button
```typescript
tertiaryButton: {
  backgroundColor: colors.background.primary,
  borderWidth: 1,
  borderColor: colors.border.default,
}
```

### Cards

#### Standard Card
```typescript
<View style={styles.card}>
  <View style={styles.iconContainer}>
    <Ionicons name="icon-name" size={28} color={colors.primary[600]} />
  </View>
  <Text style={styles.cardTitle}>Title</Text>
  <Text style={styles.cardDescription}>Description</Text>
</View>

// Styles
card: {
  backgroundColor: colors.background.primary,
  borderRadius: 16,
  padding: spacing.lg,
  ...shadows.sm,
}
```

#### List Card
```typescript
listCard: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.background.primary,
  borderRadius: 16,
  padding: spacing.lg,
  gap: spacing.md,
  ...shadows.sm,
}
```

### Headers

#### Standard Header
```typescript
<View style={styles.header}>
  <TouchableOpacity
    style={styles.backButton}
    onPress={() => navigation.goBack()}
    activeOpacity={0.7}
  >
    <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
  </TouchableOpacity>
  <Text style={styles.headerTitle}>Page Title</Text>
</View>

// Styles
header: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.xl,
  paddingTop: spacing['4xl'],
  paddingBottom: spacing.lg,
  backgroundColor: colors.background.primary,
  gap: spacing.md,
}
```

### Filter Tabs
```typescript
<View style={styles.filterContainer}>
  {tabs.map((tab) => (
    <TouchableOpacity
      key={tab}
      style={[styles.filterTab, activeTab === tab && styles.filterTabActive]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      <Text style={[styles.filterTabText, activeTab === tab && styles.filterTabTextActive]}>
        {tab}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

### Status Badges
```typescript
<View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
  <Ionicons name={config.icon} size={16} color={config.color} />
  <Text style={[styles.statusText, { color: config.color }]}>
    {config.text}
  </Text>
</View>

// Styles
statusBadge: {
  flexDirection: 'row',
  alignItems: 'center',
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.xs,
  borderRadius: 8,
  gap: spacing.xs,
}
```

### Empty States
```typescript
<View style={styles.emptyContainer}>
  <View style={styles.emptyIconContainer}>
    <Ionicons name="icon-name" size={64} color={colors.neutral[300]} />
  </View>
  <Text style={styles.emptyTitle}>Title</Text>
  <Text style={styles.emptyText}>Description</Text>
  <TouchableOpacity style={styles.actionButton}>
    <Text style={styles.actionButtonText}>Action</Text>
  </TouchableOpacity>
</View>
```

---

## Icon Guidelines

### Always Use Outline Style
```typescript
// ✅ Correct
<Ionicons name="person-outline" />
<Ionicons name="calendar-outline" />
<Ionicons name="checkmark-circle-outline" />

// ❌ Incorrect
<Ionicons name="person" />
<Ionicons name="calendar" />
<Ionicons name="checkmark-circle" />
```

### Icon Sizes
```typescript
Small:   16px - In text, badges
Medium:  20px - Buttons, inputs
Large:   24px - Headers, navigation
XL:      28px - Card icons
Display: 64px - Empty states
```

### Common Icons Reference
```typescript
// Navigation
arrow-back, arrow-forward, chevron-forward, close

// Actions
add-circle-outline, checkmark-circle, close-circle
checkmark, close, trash-outline

// Content
calendar-outline, time-outline, location-outline
clipboard-outline, document-text-outline

// People
person-outline, people-outline, school-outline

// Status
checkmark-circle, time-outline, alert-circle-outline
information-circle-outline

// Communication
mail-outline, call-outline, chatbubble-outline

// Business
business-outline, car-sport-outline, cash-outline
```

---

## Screen Patterns

### Dashboard Pattern
```typescript
// Structure
- Header (greeting + user name + logout)
- ScrollView
  - Section title
  - Grid of menu cards (2 columns)
```

### List Pattern
```typescript
// Structure
- Header (back button + title)
- Filter tabs (optional)
- FlatList with pull-to-refresh
- Empty state
```

### Form Pattern
```typescript
// Structure
- Header (back button + title)
- ScrollView
  - Form sections
  - Labels above inputs
  - Submit button at bottom
```

### Detail Pattern
```typescript
// Structure
- Header (back button + title)
- ScrollView
  - Main info card
  - Tabs or sections
  - Action buttons
```

---

## Color Usage Guide

### When to Use Each Color

#### Primary Blue (`colors.primary[600]`)
- Primary actions (submit buttons)
- Active states
- Important icons
- Links

#### Success Green (`colors.success[500]`)
- Success states
- Approved status
- Positive feedback
- Completion indicators

#### Warning Orange (`colors.warning[500]`)
- Pending states
- Important notices
- Scheduled items

#### Error Red (`colors.error[500]`)
- Error states
- Rejected status
- Destructive actions (delete, cancel)
- Validation errors

#### Neutral Gray
- `50`: Page backgrounds
- `100`: Card backgrounds, empty state containers
- `300`: Disabled icons, empty state icons
- `400`: Placeholder text, input icons
- `600`: Secondary text
- `900`: Primary text

---

## Spacing Strategy

### Component Internal Spacing
```typescript
Icon to Text: spacing.xs (4px) - spacing.sm (8px)
Card Padding: spacing.lg (20px)
Section Gap: spacing.md (12px)
```

### Layout Spacing
```typescript
Screen Padding: spacing.xl (24px)
Section Margin: spacing.xl (24px) - spacing['2xl'] (32px)
Card Gap: spacing.md (12px)
```

### Header Spacing
```typescript
Top Padding: spacing['4xl'] (48px)
Bottom Padding: spacing.lg (20px)
Horizontal: spacing.xl (24px)
```

---

## Typography Hierarchy

### Headings
```typescript
Page Title: typography.size['3xl'] (30px), weight.bold
Section Title: typography.size.xl (20px), weight.bold
Card Title: typography.size.base (16px), weight.semibold
```

### Body Text
```typescript
Primary: typography.size.base (16px), weight.normal
Secondary: typography.size.sm (14px), weight.normal
Tertiary: typography.size.xs (12px), weight.normal
```

### Labels
```typescript
Form Labels: typography.size.sm (14px), weight.medium
Badge Text: typography.size.xs (12px), weight.semibold
```

---

## Animation & Interaction

### Touch Feedback
```typescript
activeOpacity={0.7} // For most touchables
activeOpacity={0.8} // For primary buttons
```

### Loading States
```typescript
<ActivityIndicator size="small" color={colors.primary[600]} />
<ActivityIndicator size="large" color={colors.primary[600]} /> // Full screen
```

### Pull to Refresh
```typescript
<RefreshControl
  refreshing={refreshing}
  onRefresh={onRefresh}
  tintColor={colors.primary[600]}
/>
```

---

## Accessibility

### Minimum Touch Targets
```typescript
Button Height: 52px
Icon Button: 44x44px
Filter Tab: Full width, 40px height
```

### Color Contrast
- Text on white: Use `colors.text.primary` (AA compliant)
- Text on colored bg: Use `colors.text.inverse` (white)
- Never use low contrast combinations

---

## Testing Checklist

### Visual QA
- [ ] All icons are outline style
- [ ] Spacing follows theme values
- [ ] Shadows are subtle (sm or base)
- [ ] Border radius is consistent (8-16px)
- [ ] Colors from theme palette only

### Interaction QA
- [ ] Touch targets 44x44px minimum
- [ ] activeOpacity set on all touchables
- [ ] Loading states for async actions
- [ ] Pull-to-refresh works
- [ ] Empty states show proper guidance

### Typography QA
- [ ] Font sizes from theme
- [ ] Font weights appropriate for content
- [ ] Line height set for readability
- [ ] Text color contrasts properly

---

## Quick Reference

### Import Theme
```typescript
import { colors, typography, spacing, shadows } from '../../theme';
```

### Standard Card
```typescript
{
  backgroundColor: colors.background.primary,
  borderRadius: 16,
  padding: spacing.lg,
  ...shadows.sm,
}
```

### Standard Button
```typescript
{
  backgroundColor: colors.primary[600],
  borderRadius: 12,
  height: 52,
  paddingHorizontal: spacing.xl,
  ...shadows.sm,
}
```

### Standard Header
```typescript
{
  paddingHorizontal: spacing.xl,
  paddingTop: spacing['4xl'],
  paddingBottom: spacing.lg,
  backgroundColor: colors.background.primary,
}
```

---

## Examples Gallery

See implemented screens:
- ✅ LoginScreen - Clean form with social options
- ✅ StudentDashboard - Card grid layout
- ✅ SchoolsListScreen - List with cards
- ✅ MyLessonsScreen - Filter tabs + cards
- ✅ EnrollmentRequestsScreen - Approval workflow
- ✅ MyExamsScreen - Results display

---

This design system ensures every screen feels part of a cohesive, premium experience. 🎨✨
