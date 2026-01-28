# Supabase Email Configuration

This guide will help you set up beautiful, professional email templates for your Gate application.

## Step 1: Update Email Redirect URL

The email redirect URL is already configured in the code to use: `${window.location.origin}/auth/confirm`

This means users will be redirected to your confirmation page after clicking the email link.

## Step 2: Update Email Templates in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Update the following templates:

### Confirm Signup Template

Replace the default template with this modern, branded version:

```html
<html>
<head>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #334155;
      background-color: #f8fafc;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      padding: 40px 32px;
      text-align: center;
    }
    .logo {
      width: 48px;
      height: 48px;
      background: white;
      border-radius: 12px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
    }
    .header h1 {
      color: white;
      margin: 0;
      font-size: 28px;
      font-weight: 700;
    }
    .content {
      padding: 40px 32px;
    }
    .content h2 {
      color: #1e293b;
      font-size: 24px;
      margin: 0 0 16px 0;
    }
    .content p {
      color: #64748b;
      margin: 0 0 24px 0;
      font-size: 16px;
    }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: white !important;
      text-decoration: none;
      padding: 14px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      transition: transform 0.2s;
    }
    .button:hover {
      transform: translateY(-2px);
    }
    .footer {
      background: #f8fafc;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    .footer p {
      color: #94a3b8;
      font-size: 14px;
      margin: 8px 0;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1>Gate</h1>
    </div>

    <div class="content">
      <h2>Confirm your email</h2>
      <p>Thanks for signing up! Click the button below to confirm your email address and get started with protecting your content.</p>
      <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
      <p style="margin-top: 32px; font-size: 14px;">If you didn't create an account, you can safely ignore this email.</p>
    </div>

    <div class="footer">
      <p>© 2024 Gate. All rights reserved.</p>
      <p>Powered by advanced bot detection and content protection</p>
    </div>
  </div>
</body>
</html>
```

### Magic Link Template (Optional)

If you want to enable magic link authentication:

```html
<html>
<head>
  <style>
    /* Same styles as above */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1>Gate</h1>
    </div>

    <div class="content">
      <h2>Your magic link is ready</h2>
      <p>Click the button below to sign in to your account. This link will expire in 1 hour.</p>
      <a href="{{ .ConfirmationURL }}" class="button">Sign In</a>
      <p style="margin-top: 32px; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
    </div>

    <div class="footer">
      <p>© 2024 Gate. All rights reserved.</p>
      <p>Powered by advanced bot detection and content protection</p>
    </div>
  </div>
</body>
</html>
```

### Password Reset Template

```html
<html>
<head>
  <style>
    /* Same styles as above */
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      </div>
      <h1>Gate</h1>
    </div>

    <div class="content">
      <h2>Reset your password</h2>
      <p>We received a request to reset your password. Click the button below to create a new password.</p>
      <a href="{{ .ConfirmationURL }}" class="button">Reset Password</a>
      <p style="margin-top: 32px; font-size: 14px;">If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>
    </div>

    <div class="footer">
      <p>© 2024 Gate. All rights reserved.</p>
      <p>This link will expire in 1 hour for your security</p>
    </div>
  </div>
</body>
</html>
```

## Step 3: Configure Email Settings

1. In Supabase Dashboard, go to **Authentication** → **Settings**
2. Update the following settings:

### Site URL
Set to your production domain (e.g., `https://yourapp.com`)

### Redirect URLs
Add the following allowed redirect URLs:
- `http://localhost:5173/auth/confirm` (for development)
- `https://yourapp.com/auth/confirm` (for production)

### Email Auth Settings
- **Enable email confirmations**: ON
- **Secure email change**: ON
- **Double confirm email changes**: ON (recommended)

## Step 4: Test the Flow

1. Sign up with a new email address
2. Check your email inbox
3. Click the confirmation link
4. You should be redirected to `/auth/confirm` which shows a success message
5. After 3 seconds, you'll be redirected to `/login`

## Customization Tips

### Brand Colors
The email templates use a blue-to-purple gradient. To change this:
- Replace `#3b82f6` (blue) with your primary brand color
- Replace `#8b5cf6` (purple) with your secondary brand color

### Logo
The templates use an inline SVG shield icon. To use your own logo:
1. Replace the `<div class="logo">` content with an `<img>` tag
2. Host your logo somewhere and use the URL: `<img src="https://yourcdn.com/logo.png" width="48" height="48" />`

### Footer Text
Update the footer text to match your company name and tagline.

## Troubleshooting

### Emails not sending
- Check your Supabase project's email settings
- Verify your SMTP configuration (if using custom SMTP)
- Check Supabase logs for delivery errors

### Confirmation link not working
- Verify the redirect URL is added to allowed URLs in Supabase
- Check that the `/auth/confirm` route exists in your app
- Ensure the confirmation URL in the email template uses `{{ .ConfirmationURL }}`

### Styling not working
- Make sure to use inline styles in the email template
- Test the email in different clients (Gmail, Outlook, etc.)
- Use email-safe CSS properties
