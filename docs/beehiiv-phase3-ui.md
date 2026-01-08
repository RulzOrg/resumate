# Beehiiv Phase 3: User Settings UI

## Overview

Phase 3 adds a user-facing interface for managing newsletter subscriptions directly from the application settings.

## Location

**Dashboard → Settings → Preferences Tab**

## Features

### Newsletter Preferences Card

#### When Beehiiv is Enabled and User is Subscribed

```
┌─────────────────────────────────────────────────────────┐
│ Newsletter Preferences                                  │
│ Manage your newsletter subscription and email preferences│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📧 Newsletter Subscription                        [ON]  │
│    Receive updates, tips, and exclusive content         │
│                                                          │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✅ You're subscribed!                               │ │
│ │ You'll receive our newsletter at user@example.com   │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                          │
│ You can unsubscribe at any time by toggling the switch  │
│ above or by clicking the unsubscribe link in any email. │
└─────────────────────────────────────────────────────────┘
```

#### When Beehiiv is Enabled and User is NOT Subscribed

```
┌─────────────────────────────────────────────────────────┐
│ Newsletter Preferences                                  │
│ Manage your newsletter subscription and email preferences│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📧 Newsletter Subscription                       [OFF]  │
│    Receive updates, tips, and exclusive content         │
│                                                          │
│ You can unsubscribe at any time by toggling the switch  │
│ above or by clicking the unsubscribe link in any email. │
└─────────────────────────────────────────────────────────┘
```

#### When Beehiiv is Disabled

```
┌─────────────────────────────────────────────────────────┐
│ Newsletter Preferences                                  │
│ Manage your newsletter subscription and email preferences│
├─────────────────────────────────────────────────────────┤
│                                                          │
│ ℹ️  Newsletter integration is not currently enabled.    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Email Notifications Card

```
┌─────────────────────────────────────────────────────────┐
│ Email Notifications                                     │
│ Configure when we send you emails                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ Resume Updates                                    [ON]  │
│ Get notified when your resume optimization is complete  │
│                                                          │
│ Account Activity                                  [ON]  │
│ Important updates about your account and security       │
│                                                          │
│ Note: Critical account emails cannot be disabled.       │
└─────────────────────────────────────────────────────────┘
```

## User Interactions

### Subscribe Flow

1. User navigates to Settings → Preferences
2. Newsletter toggle is OFF
3. User clicks toggle to turn ON
4. Loading spinner appears
5. API call to `/api/beehiiv/subscribe`
6. Toast notification: "Successfully subscribed to newsletter"
7. Toggle turns ON
8. Green success banner appears with subscribed message

### Unsubscribe Flow

1. User navigates to Settings → Preferences
2. Newsletter toggle is ON
3. User clicks toggle to turn OFF
4. Loading spinner appears
5. API call to `/api/beehiiv/unsubscribe`
6. Toast notification: "Successfully unsubscribed from newsletter"
7. Toggle turns OFF
8. Green success banner disappears

## Technical Implementation

### Settings Page Structure

```
/app/dashboard/settings/
├── page.tsx              # Server component
└── settings-client.tsx   # Client component with tabs
```

### API Routes

```
/app/api/beehiiv/
├── subscribe/
│   └── route.ts         # POST - Subscribe user
├── unsubscribe/
│   └── route.ts         # POST - Unsubscribe user
└── status/
    └── route.ts         # GET - Check subscription status
```

### State Management

The settings client component manages:

```typescript
const [newsletterEnabled, setNewsletterEnabled] = useState(false)
const [newsletterSubscribed, setNewsletterSubscribed] = useState(false)
const [newsletterLoading, setNewsletterLoading] = useState(true)
const [newsletterActionLoading, setNewsletterActionLoading] = useState(false)
```

### Loading States

1. **Initial Load**: Spinner while fetching status from `/api/beehiiv/status`
2. **Action Loading**: Toggle disabled + spinner during subscribe/unsubscribe
3. **Success**: Toast notification + updated UI state
4. **Error**: Error toast + toggle reverts to previous state

## Error Handling

### API Errors

All errors are caught and displayed as toast notifications:

```typescript
try {
  const response = await fetch(endpoint, { method: "POST" })
  const data = await response.json()
  
  if (data.success) {
    setNewsletterSubscribed(checked)
    toast.success("Successfully subscribed to newsletter")
  } else {
    throw new Error(data.error || "Failed to update subscription")
  }
} catch (error) {
  console.error("Newsletter toggle error:", error)
  toast.error(error.message || "Failed to update subscription")
}
```

### Graceful Degradation

- If Beehiiv is disabled: Shows info message instead of toggle
- If API fails: Shows error toast, toggle remains unchanged
- If user not found: Returns 404 with error message
- If not authenticated: Returns 401 Unauthorized

## Security

### Authentication

All API endpoints require Clerk authentication:

```typescript
const { userId } = await auth()
if (!userId) {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
}
```

### Authorization

Users can only manage their own newsletter subscription:
- User ID from auth token
- User data fetched from database using Clerk ID
- No ability to modify other users' subscriptions

## Database Updates

When user subscribes/unsubscribes:

```sql
UPDATE users_sync 
SET beehiiv_subscriber_id = $1,
    updated_at = NOW()
WHERE clerk_user_id = $2 AND deleted_at IS NULL
```

## Testing Checklist

- [ ] Settings page loads without errors
- [ ] Preferences tab is visible
- [ ] Newsletter toggle appears when Beehiiv is enabled
- [ ] Toggle reflects current subscription status
- [ ] Clicking toggle subscribes user (OFF → ON)
- [ ] Clicking toggle unsubscribes user (ON → OFF)
- [ ] Toast notifications appear on success
- [ ] Toast errors appear on failure
- [ ] Loading states work correctly
- [ ] Changes persist after page refresh
- [ ] Beehiiv dashboard reflects changes
- [ ] Works on mobile devices

## Future Enhancements

Potential improvements for Phase 4:

- [ ] Email frequency preferences (daily, weekly, monthly)
- [ ] Topic/category preferences
- [ ] Preview of newsletter content
- [ ] Subscription history/analytics
- [ ] Double opt-in confirmation
- [ ] Custom welcome email preferences

