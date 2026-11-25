# Isoko Online Rwanda

Mobile-first Rwanda marketplace built with HTML, CSS, JavaScript, Supabase Auth, Supabase Database, and Supabase Storage. Product prices are in RWF. Buyers can discover products and contact sellers through WhatsApp. Pi identity support is Testnet-only.

## Included
- Public product and store discovery with search and categories.
- Email/password account registration and login.
- Free seller registration and one store per seller.
- Seller product upload with JPG, PNG, and WebP images (maximum 5 MB).
- Product moderation: new products remain pending until an Admin approves them.
- Seller sales reporting with payment reference and notes.
- Admin review of reported sales; verified sales create a one-time 3% commission ledger entry.
- Seller commission summary and report history.
- Admin view of stores, pending products, pending sale reports, total commission, collection status, and activity history.
- Row Level Security for seller-owned records.
- Pi Network identity verification through a Supabase Edge Function in Testnet mode only.

## Commission rule
The marketplace commission is **3% of the reported product sale amount**. The commission is created only when an authorized Admin independently verifies that the customer paid. The seller retains the remaining 97% of the product sale amount. Delivery fees are not included. In this WhatsApp-based release, the buyer pays the seller directly; the platform does not automatically collect or split funds. The seller settles the 3% commission separately under the agreed arrangement, and Admin records receipt only after the money is actually received.

## Important payment limitation
This version uses WhatsApp to contact the seller. It does not yet connect to a live Mobile Money, bank, or Pi payment gateway. A seller report does not prove that payment happened. Admin must check the payment independently before confirming the sale. Pi connection verifies identity only; it does not transfer Pi or verify a purchase.

## Setup
1. Deploy the project as a static site (for example, Vercel).
2. In the correct Supabase project, run the complete `schema.sql` in SQL Editor.
3. Enable Supabase Email authentication and configure the site and redirect URLs.
4. Create the owner account through the app.
5. Add the owner's Auth UUID to `public.isoko_admins` using the SQL in `launch-checklist.md`.
6. Sign out and sign in again. The Admin menu should appear for that account.
7. Deploy the `supabase/functions/pi-auth` Edge Function only if Pi Testnet identity is needed.

See `launch-checklist.md` for setup and security tests.

## Local check
Requires Node.js 20 or newer:

```bash
npm run check
```

## Configuration
The Supabase project URL and publishable/anon key are configured in `script.js`. These are browser-facing values; never put a Supabase service-role key in frontend code. Keep secrets in Supabase Edge Function secrets.


## WhatsApp merchant invitations (v2.4)
- Admin can paste Rwanda phone numbers (one per line, comma or semicolon separated).
- The app validates Rwanda mobile number formats and prepares a fixed invitation in Kinyarwanda with the marketplace URL and 3% commission explanation.
- Admin opens one WhatsApp conversation at a time, sends the prefilled message in WhatsApp, then advances to the next number.
- WhatsApp requires the sender to press Send; this website cannot silently send messages from a personal WhatsApp account. Use invitations only for people who have agreed to receive them.
