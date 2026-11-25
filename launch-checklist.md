# Isoko Online Rwanda v2.3 — launch checklist

## 1. Supabase database
1. Open the correct Supabase project and take a database backup first.
2. Open SQL Editor and run the complete `schema.sql` file once.
3. Confirm that `isoko_stores`, `isoko_products`, `isoko_sales`, `isoko_commissions`, `isoko_activity_logs`, `isoko_admins` exist.
4. Enable Email authentication and configure the deployed site URL plus redirect URLs.
5. Create the owner's account in the app, then find that account's UUID in Supabase Authentication > Users.
6. In SQL Editor, grant Admin to the owner's UUID:

```sql
insert into public.isoko_admins(user_id)
values ('PASTE-OWNER-AUTH-USER-UUID-HERE')
on conflict (user_id) do nothing;
```

7. Sign out and sign in again. The Admin menu should now appear.
8. Test that one seller cannot read or edit another seller's products, sales.

## 2. Seller and Admin workflow
- Sellers register for free, create one store, and upload products for free.
- New products are pending until Admin approves them.
- Sellers report a sale after receiving payment and provide a reference / payment note where available.
- Admin independently checks the payment evidence before using **Emeza ko yishyuwe & bara 3%**.
- The database records a unique 3% commission only once per verified sale.
- The seller receives buyer payment directly in this WhatsApp-based release and owes the agreed 3% commission to the marketplace. Admin records the commission as collected only after actually receiving it.

## 3. Payment limitation — important
- This build keeps WhatsApp checkout and does not include a live Mobile Money gateway, bank payment gateway, or Pi payment approval integration. Buyer funds go directly to the seller; the marketplace does not hold or split them automatically.
- A seller's sale report is NOT proof of payment. Admin must verify it independently before confirming.
- Pi identity connection remains Testnet-only. It does not transfer Pi and does not confirm payment.
- Do not describe the commission as automatically collected. It is calculated in the database after Admin verifies the payment.

## 4. Pi Network Testnet identity
- Register the app in Pi Developer Portal using Pi Browser.
- Configure the exact deployed domain and choose Testnet.
- Deploy `supabase/functions/pi-auth`.
- Confirm the deployed function's JWT setting matches the current function deployment instructions.
- Test Pi account verification from Pi Browser.
- Do not enable Mainnet or advertise Pi checkout in this release.

## 5. Before public launch
- Add a monitored support email and operator details.
- Review Privacy and Terms against actual data practices and applicable Rwanda requirements.
- Test signup, login, store creation, image upload, product approval, WhatsApp enquiry, sale report, Admin verification, commission calculation, and commission collection recording on Android and desktop.
- Test refund / cancellation handling manually; this release does not automatically reverse verified sales or commissions.
- Remember that sample products are examples, not verified seller stock.


## WhatsApp invitation test (v2.4)
1. Sign in with the configured Admin account.
2. Open Admin → Tumira abacuruzi kuri WhatsApp.
3. Test with your own second/consenting test number before inviting others.
4. Confirm the correct recipient and prefilled Kinyarwanda message appear in WhatsApp.
5. Press Send manually, return to the app, and use “Nohereje — ubutaha” for the next number.
6. Do not treat opening WhatsApp as proof that a message was sent.
