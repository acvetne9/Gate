# Component Library

Reusable components for consistent styling across the Gate application.

## Components

### Card

A styled card with corner decorations and consistent border styling.

```tsx
import { Card } from '../components'

// Basic usage
<Card className="p-6">
  <h2>Card Title</h2>
  <p>Card content</p>
</Card>

// With custom corner size
<Card cornerSize="lg" className="p-8">
  <p>Large corners</p>
</Card>

// Without corners
<Card withCorners={false} className="p-4">
  <p>No corner decorations</p>
</Card>
```

**Props:**
- `children`: ReactNode (required)
- `className`: string - Additional CSS classes
- `cornerSize`: 'sm' | 'md' | 'lg' - Size of corner decorations (default: 'md')
- `withCorners`: boolean - Show/hide corner decorations (default: true)
- `variant`: 'default' | 'bordered' - Card variant (default: 'default')

---

### Button

Styled button component with variants and loading states.

```tsx
import { Button } from '../components'

// Primary button
<Button onClick={handleClick}>
  Click Me
</Button>

// Secondary button
<Button variant="secondary" onClick={handleClick}>
  Cancel
</Button>

// Ghost button
<Button variant="ghost" onClick={handleClick}>
  Close
</Button>

// With loading state
<Button loading={isLoading} onClick={handleSubmit}>
  Submit
</Button>

// Full width button
<Button fullWidth size="lg">
  Continue
</Button>
```

**Props:**
- `children`: ReactNode (required)
- `variant`: 'primary' | 'secondary' | 'ghost' - Button style (default: 'primary')
- `size`: 'sm' | 'md' | 'lg' - Button size (default: 'md')
- `loading`: boolean - Show loading spinner (default: false)
- `fullWidth`: boolean - Take full width (default: false)
- `className`: string - Additional CSS classes
- All standard button HTML attributes (`onClick`, `disabled`, etc.)

---

### NavigationHeader

Consistent navigation header used across authenticated pages.

```tsx
import { NavigationHeader } from '../components'

// Basic usage
<NavigationHeader />

// With custom actions
<NavigationHeader
  customActions={
    <button onClick={handleAction}>Custom Action</button>
  }
/>

// Hide default actions
<NavigationHeader hideActions />
```

**Props:**
- `hideActions`: boolean - Hide default action buttons (default: false)
- `customActions`: ReactNode - Replace default actions with custom content

**Features:**
- Automatically includes Gate logo
- Navigation links (Home, Demo, Dashboard, Get Started, Blog)
- Admin Panel link (for admin users)
- Billing and Sign Out buttons (customizable)
- Responsive design with mobile menu support

---

### PageHeader

Reusable page header with title, optional subtitle, and actions.

```tsx
import { PageHeader } from '../components'

// Basic usage
<PageHeader title="Dashboard" />

// With subtitle
<PageHeader
  title="Dashboard"
  subtitle="Manage your sites and monitor traffic"
/>

// With underline decoration
<PageHeader
  title="Settings"
  subtitle="Configure your preferences"
  withUnderline
/>

// With action buttons
<PageHeader
  title="Billing"
  subtitle="Manage subscriptions"
  actions={
    <Button onClick={handleUpgrade}>Upgrade</Button>
  }
/>
```

**Props:**
- `title`: string (required) - Page title
- `subtitle`: string - Optional subtitle/description
- `withUnderline`: boolean - Show decorative black underline (default: false)
- `actions`: ReactNode - Optional action buttons or content

---

### CornerDecorations

Corner decoration elements for cards (used internally by Card component).

```tsx
import { CornerDecorations } from '../components'

// Basic usage (inside a relative positioned element)
<div className="relative border-2 border-black">
  <CornerDecorations />
  <p>Content</p>
</div>

// With custom size
<div className="relative border-2 border-black">
  <CornerDecorations size="lg" />
  <p>Content</p>
</div>
```

**Props:**
- `size`: 'sm' | 'md' | 'lg' - Decoration size (default: 'md')
- `className`: string - Additional CSS classes for decorations

**Note:** Usually not used directly - the `Card` component handles this automatically.

---

## Design System

All components follow the Gate design system:

- **Colors**: Black (`#000`) borders, white/gray backgrounds
- **Borders**: 2px solid black for primary elements
- **Corners**: Decorative corner accents on cards
- **Typography**: Bold headings, gray-600 for secondary text
- **Buttons**: Black primary, white secondary, transparent ghost
- **Spacing**: Consistent padding and margins using Tailwind classes

## Example: Refactoring a Page

**Before:**
```tsx
<div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
  {/* Navigation - 50+ lines of duplicated code */}
  <nav className="border-b border-black bg-gray-50">
    {/* ... lots of nav code ... */}
  </nav>

  <div className="max-w-7xl mx-auto px-4 py-8">
    {/* Card with manual corner decorations */}
    <div className="border-2 border-black bg-white relative p-6">
      <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-black"></div>
      <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-black"></div>
      <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-black"></div>
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-black"></div>
      <p>Content</p>
    </div>

    {/* Manual button */}
    <button className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition">
      Click Me
    </button>
  </div>
</div>
```

**After:**
```tsx
import { NavigationHeader, Card, Button, PageHeader } from '../components'

<div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-white">
  <NavigationHeader />

  <div className="max-w-7xl mx-auto px-4 py-8">
    <PageHeader title="My Page" subtitle="Page description" />

    <Card className="p-6" cornerSize="sm">
      <p>Content</p>
    </Card>

    <Button onClick={handleClick}>
      Click Me
    </Button>
  </div>
</div>
```

**Benefits:**
- **83% less code** for common UI patterns
- **Consistent styling** across all pages
- **Easier maintenance** - update once, applies everywhere
- **Better readability** - clear component names
- **Type safety** - TypeScript props ensure correct usage

## Import Pattern

```tsx
// Single import for all components
import { Card, Button, NavigationHeader, PageHeader } from '../components'

// Or import individually
import { Card } from '../components/Card'
import { Button } from '../components/Button'
```

## Contributing

When creating new components:

1. Follow the existing design system
2. Add TypeScript types for all props
3. Include JSDoc comments
4. Add examples to this README
5. Test in multiple pages before deployment
