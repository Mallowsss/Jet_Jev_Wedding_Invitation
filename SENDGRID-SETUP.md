# 📧 SendGrid Setup Guide (Replaces Gmail)

## Why SendGrid?

Gmail SMTP is blocked on Render's free tier. SendGrid uses HTTP API instead and is completely free for up to 100 emails/day - perfect for wedding RSVPs!

---

## Step 1: Create SendGrid Account (2 minutes)

1. Go to: https://signup.sendgrid.com/
2. Sign up with your email (you can use `mallows3124@gmail.com`)
3. Verify your email address
4. Complete the onboarding (choose "Free" plan - 100 emails/day forever)

---

## Step 2: Create API Key (1 minute)

1. After logging in, go to: **Settings → API Keys**
   - Direct link: https://app.sendgrid.com/settings/api_keys
2. Click **Create API Key**
3. Name it: `Wedding RSVP`
4. Permissions: Select **Full Access** (or just "Mail Send")
5. Click **Create & View**
6. **COPY THE API KEY** — it looks like: `SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - ⚠️ You can only see this ONCE! Save it now.

---

## Step 3: Verify Sender Email (Required - 3 minutes)

SendGrid requires you to verify that you own the "from" email address.

### Option A: Single Sender Verification (Easiest)

1. Go to: **Settings → Sender Authentication → Single Sender Verification**
   - Direct link: https://app.sendgrid.com/settings/sender_auth/senders
2. Click **Create New Sender**
3. Fill in:
   - **From Name:** Jet & Jev Wedding
   - **From Email:** mallows3124@gmail.com
   - **Reply To:** mallows3124@gmail.com
   - **Address, City, State, Zip:** (your real address - required by anti-spam laws)
4. Click **Create**
5. **Check your email** (mallows3124@gmail.com) for verification link
6. Click the link to verify

### Option B: Domain Authentication (Advanced)

If you have a custom domain (e.g., jetandjev.com), you can verify the entire domain. This is optional.

---

## Step 4: Add to Render Environment Variables

1. Go to your Render dashboard → your wedding service → **Environment**
2. **Remove** the old Gmail variables:
   - Delete: `GMAIL_USER`
   - Delete: `GMAIL_PASS`
3. **Add new SendGrid variables:**

   **Variable 1:**
   - Key: `SENDGRID_API_KEY`
   - Value: (paste the API key from Step 2 - starts with `SG.`)

   **Variable 2:**
   - Key: `SENDGRID_FROM_EMAIL`
   - Value: `mallows3124@gmail.com` (must match the verified sender from Step 3)

4. Click **Save Changes**
5. Render will ask to redeploy → Click **Deploy**

---

## Step 5: Test

1. Wait for deploy to finish
2. Check logs — you should see:
   ```
   ✅ Server running on port 10000
   📧 SendGrid: ✅ Configured
   📮 From Email: mallows3124@gmail.com
   ```
3. Submit a test RSVP
4. Watch logs — you should see:
   ```
   📧 Starting email send...
     ✅ Host email sent to mallows3124@gmail.com
     ✅ Guest email sent to [test email]
   ✅ ALL EMAILS SENT
   ```
5. Check your inbox! (Check spam folder first time)

---

## Troubleshooting

### Error: "The from email does not match a verified Sender Identity"
**Fix:** Go back to Step 3 and verify your sender email. Make sure `SENDGRID_FROM_EMAIL` matches exactly.

### Error: "Forbidden"
**Fix:** Your API key doesn't have Mail Send permissions. Create a new API key with Full Access.

### No error but no email received
**Fix:** Check your spam folder. Add SendGrid to your contacts.

---

## SendGrid Dashboard

Monitor your emails at: https://app.sendgrid.com/email_activity

You can see:
- How many emails sent today
- Delivery status
- Open rates (if you enable tracking)

---

## Summary

**Old setup (Gmail):**
- ❌ Blocked by Render
- Required: App Password setup

**New setup (SendGrid):**
- ✅ Works on Render free tier
- ✅ 100 free emails/day (plenty for a wedding)
- ✅ Better delivery rates
- ✅ Email tracking dashboard
- Required: API key + verified sender

Total setup time: ~5 minutes
