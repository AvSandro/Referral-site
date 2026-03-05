# NT Estate Partners - Cloudflare Worker Deployment Guide

This guide walks you through deploying the referral form with email automation to Cloudflare Workers.

## Files Included

- **worker.js** - Main Cloudflare Worker script
- **wrangler.toml** - Cloudflare Workers configuration
- **index.html** - Updated with referral form
- **style.css** - Updated with form styling
- **interactions.js** - Client-side interactions

## Prerequisites

1. **Cloudflare Account** - Sign up at https://dash.cloudflare.com/
2. **Domain** - ntestatepartners.com (or your domain)
3. **Node.js** - For running Wrangler CLI
4. **Email Service** - Choose one:
   - Cloudflare Email Routing (free, limited)
   - SendGrid (recommended for production)
   - Mailgun
   - Any SMTP service

## Quick Start

### 1. Install Wrangler CLI

```bash
npm install -g @cloudflare/wrangler
# or
npm install --save-dev @cloudflare/wrangler
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Update wrangler.toml

Edit `wrangler.toml` and replace:
- `YOUR_ACCOUNT_ID` - Get from Cloudflare Dashboard > Account Settings
- `YOUR_ZONE_ID` - Get from Cloudflare Dashboard > Domain > Overview

```bash
# Find these values:
wrangler whoami  # Shows account info
```

### 4. Choose an Email Service

#### Option A: SendGrid (Recommended)

1. Sign up at https://sendgrid.com/
2. Create API key
3. Update `wrangler.toml`:

```toml
[env.production]
vars = { SENDGRID_API_KEY = "YOUR_SENDGRID_API_KEY" }
```

#### Option B: Mailgun

1. Sign up at https://www.mailgun.com/
2. Get API key and domain
3. Update `wrangler.toml`:

```toml
[env.production]
vars = { 
  MAILGUN_API_KEY = "YOUR_KEY",
  MAILGUN_DOMAIN = "your-domain.mailgun.org"
}
```

#### Option C: Cloudflare Email Routing (Free, Limited)

1. In Cloudflare Dashboard > Email > Email Routing
2. Add forwarding rule: `noreply@ntestatepartners.com` → `ops@ntestatepartners.com`
3. Uncomment in `wrangler.toml`:

```toml
[[env.production.bindings]]
name = "SEND_EMAIL"
type = "service"
service = "send-email"
```

### 5. Deploy to Cloudflare Workers

```bash
# Development
wrangler dev

# Production
wrangler deploy --env production
```

### 6. Test the Form

Visit `https://ntestatepartners.com` (or dev URL) and submit a test referral form.

## Form Fields

The referral form captures:
- **Name** (required)
- **Email** (required)
- **Phone** (required)
- **Service Type** (Pools, Landscaping, Hardscape, etc.)
- **Budget Range**
- **Project Details**

## Email Content

When a referral is submitted, an email is sent to `ops@ntestatepartners.com` with:
- All form data
- Formatted HTML email
- Timestamp of submission

## Success Response

On successful submission, the user sees:

> Your estate referral is being processed. Our ops team will connect with a vetted partner within 48 hours.

## Error Handling

If the email fails to send, the user sees an error message:

> An error occurred while processing your referral. Please try again or contact ops@ntestatepartners.com.

## Troubleshooting

### "No provider found for email"
- Ensure you've configured an email service (SendGrid, Mailgun, or Email Routing)
- Check `wrangler.toml` for correct API keys

### Form submits but no email arrives
- Check spam folder
- Verify `ops@ntestatepartners.com` is correct
- Test SendGrid/Mailgun API credentials in their dashboards

### CORS errors
- The worker allows cross-origin requests by default
- Update `Access-Control-Allow-Origin` in worker.js if needed

### 404 Not Found
- Ensure worker route is configured correctly in `wrangler.toml`
- Route should match your domain: `ntestatepartners.com/*`

## Production Deployment Checklist

- [ ] Update `wrangler.toml` with correct account/zone IDs
- [ ] Configure email service (SendGrid/Mailgun/Email Routing)
- [ ] Set environment variables in Cloudflare Dashboard
- [ ] Test form submission in development (`wrangler dev`)
- [ ] Deploy to production (`wrangler deploy --env production`)
- [ ] Monitor email logs in your email service dashboard
- [ ] Set up alerts for form submissions

## Environment Variables

Securely set environment variables in Cloudflare Dashboard:

1. Go to Workers > Settings
2. Add Environment Variables:
   - `SENDGRID_API_KEY` (if using SendGrid)
   - `MAILGUN_API_KEY` (if using Mailgun)
   - `MAILGUN_DOMAIN` (if using Mailgun)

Never commit API keys to GitHub!

## Monitoring

Monitor form submissions:
- SendGrid Dashboard > Marketing Emails
- Mailgun Dashboard > Logs
- Cloudflare Dashboard > Workers > Logs

## Advanced

### Custom Domain

To use a custom domain (not workers.dev):

1. Route in `wrangler.toml`: `route = "ntestatepartners.com/*"`
2. Zone ID must match the domain's Cloudflare zone
3. Deploy: `wrangler deploy`

### CORS for Multiple Domains

Edit worker.js:

```javascript
const allowedOrigins = ['ntestatepartners.com', 'www.ntestatepartners.com'];

function getCorsHeaders(origin) {
  const allowed = allowedOrigins.some(o => origin.includes(o));
  return {
    'Access-Control-Allow-Origin': allowed ? origin : 'null'
  };
}
```

### Database Integration

To store form submissions, add D1 (Cloudflare SQL):

```toml
[[env.production.bindings]]
name = "DB"
type = "d1"
database_name = "referrals"
```

Then in worker.js:

```javascript
await env.DB.exec(`
  INSERT INTO referrals (name, email, phone, service_type, budget, details)
  VALUES (?, ?, ?, ?, ?, ?)
`, [name, email, phone, serviceType, budget, projectDetails]);
```

## Support

For issues:
- Cloudflare Docs: https://developers.cloudflare.com/workers/
- Email Service Docs: SendGrid / Mailgun / Cloudflare
- Debug: Check worker logs in Cloudflare Dashboard

---

**Deployment Status**: Ready for production ✅
