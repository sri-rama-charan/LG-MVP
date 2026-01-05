# Moving to Production (Going Live)

You asked: *"How can everyone join the sandbox in real time?"*

**The Answer:** In a real production app, users **do NOT** join a sandbox.

## The Difference

| Feature | Sandbox (Development) | Production (Live) |
| :--- | :--- | :--- |
| **Purpose** | Testing code & logic | Sending to real customers |
| **Recipient Rule** | Must "Join" via code | Any valid WhatsApp number |
| **Cost** | Free (Trial limits) | Per message (approx 5-8 paisa) |
| **Setup Time** | Instant | 2-4 Weeks (Business Verification) |

## Steps to Go Live

If you want to send messages to **any** number without them joining, you must upgrade your account:

1.  **Upgrade Twilio/Meta Account**: Add a credit card and move to a paid plan.
2.  **Business Verification**: Submit your Business Documents (GST/Registration) to Meta via the Twilio Console.
3.  **Display Name Review**: Meta will approve your business name (e.g., "Charan Campaigns").
4.  **Phone Number Migration**: likely need a dedicated clean phone number.

## For Your Demo / MVP

Since verification takes weeks, use one of these strategies for your presentation:

### Strategy A: Safe Mode (Recommended)
Keep `WHATSAPP_SAFE_MODE=true`.
*   **How it works**: Deep down, the code *thinks* it is sending to 1,000 people.
*   **Result**: The system redirects all 1,000 messages to **YOUR** phone.
*   **Demo**: You show your phone receiving the message and say: *"In production, this would go to the actual user."*

### Strategy B: Live Test Crew
Keep `WHATSAPP_SAFE_MODE=false`.
1.  Add 2-3 specific friends to your database.
2.  Ask those 3 friends to join your Sandbox.
3.  **Demo**: Click launch, and they all get the message instantly.

## Summary

The "Join Sandbox" step is a **temporary restriction** only for testing. It is removed completely once you verify your business.
