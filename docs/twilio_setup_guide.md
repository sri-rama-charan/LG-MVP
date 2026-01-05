# How to Get Twilio WhatsApp Credentials

Twilio is easier to set up than Meta. Use the **Twilio Sandbox** for testing.

## 1. Create a Twilio Account
1.  Go to [twilio.com](https://www.twilio.com/) and sign up (free trial).
2.  Verify your email and phone number.

## 2. Get Your Account Credentials
On the **Twilio Console Dashboard**:
1.  Copy the **Account SID**.
2.  Copy the **Auth Token**.
    *   **Save these in your `.env` file.**

## 3. Activate the WhatsApp Sandbox
1.  Go to **Messaging** > **Try it out** > **Send a WhatsApp message**.
2.  Twilio will show you a Sandbox Number (e.g., `+1 415 523 8886`) and a **Activation Code** (e.g., `join something-random`).
3.  **Action Required**: Send a WhatsApp message from your real phone (`8977958449`) to the Sandbox Number with that code.
    *   *This connects your phone to the sandbox so you can receive messages.*

## 4. Update Your Project
Add these lines to `c:\projects\mvp\backend\.env`:

```env
WHATSAPP_PROVIDER=TWILIO
TWILIO_SID=your_copied_account_sid
TWILIO_AUTH_TOKEN=your_copied_auth_token
WHATSAPP_TEST_NUMBER=+918977958449
# The sandbox number usually behaves as the 'from' number
```

> **Note**: In the Sandbox, you can ONLY send to numbers that have "joined" via the code. Since we are using "Safe Mode" to redirect everything to your number, this will work perfectly.
