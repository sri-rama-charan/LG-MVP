# How to Configure Real Email Sending (Gmail)

To receive the OTP in your actual inbox (instead of the terminal), you need to configure an email provider. The easiest way is using **Gmail**.

## 1. Create an App Password (for Gmail)
*(You cannot use your normal password due to security).*

1.  Go to your [Google Account Security Page](https://myaccount.google.com/security).
2.  Enable **2-Step Verification** (if not already enabled).
3.  Search for **"App Passwords"** in the top search bar (or look under 2-Step Verification options).
4.  Create a new App Password:
    *   **App Name**: `MVP App`
    *   **Click Create**.
5.  Copy the 16-character password (e.g., `abcd efgh ijkl mnop`).

## 2. Update Environment Variables
Open your `backend/.env` file and add the following:

```env
# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=abcd efgh ijkl mnop   <-- Paste your 16-char App Password here
```

## 3. Restart Server
1.  Stop the backend server (`Ctrl+C`).
2.  Start it again (`npm run dev`).

## Verification
Next time you register or login, the system will detect these keys and actually send the email to your inbox!
