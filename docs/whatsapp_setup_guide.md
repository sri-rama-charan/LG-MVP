# How to Get WhatsApp API Credentials (Meta)

Follow these steps to get your **Phone Number ID** and **Access Token** for free testing.

## 1. Create a Meta Developer App
1.  Go to [developers.facebook.com](https://developers.facebook.com/).
2.  Click **"My Apps"** (top right) -> **"Create App"**.
3.  Select **"Other"** (or "Business") and click **Next**.
4.  Select **"Business"** as the app type.
5.  Fill in the App Name (e.g., "MVP Test") and create the app.

## 2. Add WhatsApp Product
1.  On the App Dashboard, scroll down to find **"WhatsApp"**.
2.  Click **"Set up"**.
3.  Select a specific Business Portfolio if asked (or create a test one).

## 3. Get Your Credentials
You will be redirected to the **"API Setup"** page (under WhatsApp > API Setup in the left menu).

### A. Temporary Access Token
-   Copy the long string under **"Temporary access token"**.
-   *Note: This lasts 24 hours. For production, you need a System User token, but this is fine for today.*
-   **Save this as `WHATSAPP_TOKEN` in your `.env` file.**

### B. Phone Number ID
-   Look for the section **"Sending and receiving messages"**.
-   Copy the **"Phone number ID"** (usually strictly numeric, e.g., `10567...`).
-   **Save this as `WHATSAPP_PHONE_ID` in your `.env` file.**

## 4. Verify Your Test Number
**Crucial Step for Free Tier:**
1.  On the same "API Setup" page, scroll to the **"To"** field.
2.  Click **"Manage phone number list"**.
3.  Add your real phone number (`8977958449`) and verify it with the OTP code they send you.
    *   *Without this, you cannot send messages to this number using the Test Account.*

## 5. Update Your Project
Add these lines to `c:\projects\mvp\backend\.env`:

```env
WHATSAPP_PROVIDER=META
WHATSAPP_PHONE_ID=your_copied_phone_id
WHATSAPP_TOKEN=your_copied_temporary_token
WHATSAPP_TEST_NUMBER=8977958449
```
