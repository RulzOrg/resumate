# Admin Portal Setup Guide

This guide explains how to set up and use the admin portal for ResuMate AI.

## Overview

The admin portal provides a secure interface for platform administrators to:
- View platform statistics and analytics
- Manage users (view, update, delete)
- Update user subscriptions manually
- View audit logs of admin actions
- Monitor platform growth and activity

## Setup Instructions

### 1. Run Database Migration

First, create the admin audit logs table:

```bash
# Using the migration file
cat prisma/migrations/add_admin_audit_logs.sql | psql "$DATABASE_URL"

# Or using a database client of your choice
```

The migration creates the `admin_audit_logs` table for tracking all admin actions.

### 2. Make Yourself an Admin

You have two options to grant admin access:

#### Option A: Using Clerk Dashboard (Recommended)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com/)
2. Navigate to **Users**
3. Click on your user account
4. Scroll to **Public metadata**
5. Add the following JSON:
   ```json
   {
     "role": "admin"
   }
   ```
6. Click **Save**

#### Option B: Using the Script

1. Find your Clerk User ID from the Clerk Dashboard (starts with `user_`)
2. Run the script:
   ```bash
   npx tsx scripts/make-admin.ts user_YOUR_USER_ID
   ```

Example:
```bash
npx tsx scripts/make-admin.ts user_2abc123xyz456
```

### 3. Verify Access

1. Log out and log back in (to refresh your session)
2. Go to your dashboard at `/dashboard`
3. You should now see **"Admin Portal"** in the sidebar
4. Click it to access `/dashboard/admin`

## Features

### Dashboard Overview (`/dashboard/admin`)

- **Statistics Cards**: Total users, active users, pro users, total resumes
- **Growth Metrics**: Users created today, this week, this month
- **Subscription Split**: Breakdown of free, pro, and enterprise users
- **Recent Users Table**: Latest 10 registered users

### User Management (`/dashboard/admin/users`)

- **Search**: Find users by name or email
- **Filter**: Filter by subscription status (free, active, canceled)
- **Pagination**: Navigate through all users (50 per page)
- **User Table**: View user details, subscription, resume count, job analyses
- **Actions**: View user details or delete user

### User Details (`/dashboard/admin/users/[userId]`)

- **Account Information**: User ID, Clerk ID, join date, onboarding status
- **Subscription Management**: Update subscription status and plan
- **Activity Overview**: View resumes, job analyses, and applications
- **Resource Lists**: Detailed lists of user's resumes and job analyses
- **Delete User**: Permanently remove user and all associated data

## API Endpoints

All admin API endpoints are protected and require admin authentication:

### Users
- `GET /api/admin/users` - List all users with pagination/search
- `GET /api/admin/users/[userId]` - Get user details
- `PATCH /api/admin/users/[userId]` - Update user subscription
- `DELETE /api/admin/users/[userId]` - Delete user

### Statistics
- `GET /api/admin/stats` - Get platform statistics

## Security Features

### Authentication & Authorization

1. **Middleware Protection**: Admin routes are protected at the middleware level
2. **API Protection**: All admin API endpoints verify admin role via Clerk
3. **Audit Logging**: All admin actions are logged with:
   - Admin user ID
   - Action type
   - Target user ID
   - Action details
   - Timestamp

### Audit Trail

Every admin action is logged in the `admin_audit_logs` table:

- `LIST_USERS` - Viewing user list
- `VIEW_USER_DETAILS` - Viewing specific user
- `UPDATE_USER_SUBSCRIPTION` - Changing subscription
- `DELETE_USER` - Removing user
- `VIEW_STATS` - Viewing platform stats

## Granting Admin Access to Others

To make another user an admin:

```bash
# Using the script
npx tsx scripts/make-admin.ts user_THEIR_USER_ID

# Or use Clerk Dashboard (see Option A above)
```

## Revoking Admin Access

To remove admin access:

1. Go to Clerk Dashboard
2. Find the user
3. Edit their Public metadata
4. Remove the `"role": "admin"` entry
5. Save

The user will lose admin access on their next page load.

## Best Practices

1. **Limit Admin Access**: Only grant admin role to trusted team members
2. **Regular Audits**: Review audit logs regularly for suspicious activity
3. **Test Changes**: Always test subscription changes on test accounts first
4. **Backup Before Deletion**: User deletion is permanent - verify before deleting
5. **Use Staging**: Test admin features in a staging environment first

## Troubleshooting

### "Forbidden: Admin access required" Error

- Verify your public metadata includes `"role": "admin"`
- Log out and log back in to refresh your session
- Check that you're in the correct Clerk environment (dev/prod)

### Admin Sidebar Menu Not Visible

- Clear browser cache and cookies
- Verify the role is set in Clerk Dashboard
- Check browser console for errors

### Database Errors

- Ensure migration was run successfully
- Check DATABASE_URL environment variable
- Verify database connection

### Cannot Delete Users

- Check Clerk API credentials are correct
- Ensure CLERK_SECRET_KEY is set
- Verify the user exists in both Clerk and database

## Future Enhancements

Potential future features for the admin portal:

- [ ] Bulk user operations
- [ ] Advanced analytics and charts
- [ ] User activity timeline
- [ ] Email templates management
- [ ] System configuration panel
- [ ] Export data to CSV/Excel
- [ ] Email users from admin panel
- [ ] Impersonate user (for support)
- [ ] API usage statistics
- [ ] Webhook management

## Support

For issues or questions:
1. Check the audit logs for error details
2. Review Clerk Dashboard for authentication issues
3. Check database logs for query errors
4. Verify environment variables are set correctly
