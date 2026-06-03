# 🔍 Email Troubleshooting Guide

## Quick Checklist

✅ **Before anything else, verify these 3 things:**

1. **Environment variables are set in Render**
   - Go to Render dashboard → your service → Environment
   - You should see:
     - `GMAIL_USER` = `mallows3124@gmail.com`
     - `GMAIL_PASS` = `your-16-char-app-password`
   - If missing → add them → **Redeploy**

2. **Gmail App Password is correct**
   - NOT your regular Gmail password
   - Must be a 16-character App Password from Google
   - See "How to Generate App Password" below

3. **Check Render logs for errors**
   - Go to Render dashboard → your service → Logs
   - Look for lines with ❌ or "Email error:"
   - Common errors explained below

---

## Step-by-Step Fix

### 1. Generate Gmail App Password (if you haven't)

1. Go to: https://myaccount.google.com/security
2. Make sure **2-Step Verification** is ON
3. Search for "App passwords" → click it
4. Click **Select app** → choose **Mail**
5. Click **Select device** → choose **Other**
6. Type "Wedding RSVP" → **Generate**
7. **Copy the 16-character password** (e.g. `abcd efgh ijkl mnop`)
   - Remove the spaces: `abcdefghijklmnop`
8. Keep this password — you'll paste it in Render

### 2. Add Environment Variables in Render

1. Go to: https://dashboard.render.com
2. Click your wedding service
3. Click **Environment** in the left sidebar
4. Click **Add Environment Variable**
5. Add the first one:
   - Key: `GMAIL_USER`
   - Value: `mallows3124@gmail.com`
6. Click **Add Environment Variable** again
7. Add the second one:
   - Key: `GMAIL_PASS`
   - Value: `your-16-char-app-password` (paste the one from step 1)
8. Click **Save Changes**
9. **IMPORTANT:** Render will ask to redeploy → click **Yes, redeploy**

### 3. Wait for Deploy to Finish

- Watch the logs — wait for "✅ Server running on port..."
- This takes ~1-2 minutes

### 4. Test Again

1. Open your site
2. Submit an RSVP with a guest name from the list
3. Check Render logs immediately:
   - Look for: `✅ Emails sent: [Guest Name]`
   - If you see ❌ instead, read the error message

### 5. Check Your Email

- Host email should arrive at: `mallows3124@gmail.com`
- Guest email should arrive at: whatever email you entered in the form
- **Check spam folders!**
- Emails take 30 seconds - 2 minutes to arrive

---

## Common Errors & Fixes

### Error: "Invalid login: 535-5.7.8 Username and Password not accepted"
**Problem:** Wrong password or using regular Gmail password instead of App Password  
**Fix:** Generate a new App Password (see Step 1 above)

### Error: "Missing credentials"
**Problem:** Environment variables not set in Render  
**Fix:** Follow Step 2 above, make sure to redeploy

### Error: "self signed certificate in certificate chain"
**Problem:** Rare - Render network issue  
**Fix:** In server.js, add to transporter config:
```javascript
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false  // Add this line
  }
});
```

### No error in logs, but no email received
**Problem:** Emails might be going to spam  
**Fix:** 
1. Check spam folder in both host and guest email
2. Add `noreply@yourdomain.com` to contacts
3. In Gmail, search for "from:mallows3124" to find all emails

### Error: "Greeting never received"
**Problem:** Gmail is blocking the connection  
**Fix:** 
1. Go to https://myaccount.google.com/lesssecureapps
2. Turn ON "Allow less secure apps" (temporary)
3. Try again
4. Turn it back OFF after testing

---

## Testing Shortcut

Want to test if emails work WITHOUT going through the full form?

1. SSH into Render (or use local testing)
2. Create `test-email.js`:

```javascript
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS,
  },
});

transporter.sendMail({
  from: `"Test" <${process.env.GMAIL_USER}>`,
  to: "mallows3124@gmail.com",
  subject: "Test Email from Wedding RSVP",
  text: "If you see this, email is working!",
}, (err, info) => {
  if (err) {
    console.error("❌ Error:", err.message);
  } else {
    console.log("✅ Email sent:", info.messageId);
  }
});
```

3. Run: `node test-email.js`
4. Check if email arrives

---

## Still Not Working?

**Check these in Render logs:**

Look for this when server starts:
```
✅ Server running on port 3000
📧 Gmail: mallows3124@gmail.com
🌐 URL: https://your-app.onrender.com
```

If you see:
```
📧 Gmail: (not set)
```
→ Environment variables aren't set! Go back to Step 2.

**After submitting RSVP, look for:**
```
✅ Emails sent: Jessa Bacani
```

If you see:
```
❌ Email error: [some error message]
```
→ Read the error message and apply fixes above

---

## Quick Verification Commands

In Render logs, you should see:
- On startup: `📧 Gmail: mallows3124@gmail.com` ✅
- After RSVP: `✅ Emails sent: [Name]` ✅

If you DON'T see these, env vars aren't loaded properly.
