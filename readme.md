# Isoko Online Rwanda 🇷🇼 — v2.2 WhatsApp invitations

A mobile-first marketplace for everyday products in Rwanda. Prices are entered and displayed in Rwandan francs (RWF). Buyers can browse listings, filter categories, search, add products to a cart and contact the seller through WhatsApp.

## Product categories

- Food and drinks: water, cooking oil, rice, sugar, milk and other household basics.
- Beauty and hygiene: body lotion, perfume, soap and personal-care products.
- Men's and women's clothing, children's clothing and shoes.
- Bags, phones, radios and other small electronics.
- Household goods and second-hand/occasion items.

The home page contains clearly labelled sample listings when the database has no live listings. Sample items are examples only: they are not seller offers, cannot be ordered and must not be treated as verified prices or stock.

## Included

- Responsive mobile-first homepage, search and category filters.
- Supabase email/password sign-up and sign-in.
- Seller store registration with district/location and WhatsApp contact.
- Product publishing with RWF price, category, stock, new/occasion condition and photo upload.
- Public image storage bucket (`isoko-products`).
- Shopping cart and WhatsApp order enquiry for products from one store.\n- Pre-written WhatsApp merchant invitation: enter a Rwanda phone number, open WhatsApp with the invitation filled in, then manually press Send.
- Supabase Row Level Security policies for public listings and seller-owned writes.
- Privacy and Terms starter pages.

## 1. Supabase setup (required for real listings)

1. Open the Supabase project used by this app.
2. Open **SQL Editor**.
3. Paste and run the complete `schema.sql` file from this ZIP. It creates/updates `isoko_stores`, `isoko_products`, RLS policies and the `isoko-products` image bucket. It does not delete the older `stores` or `products` tables.
4. In **Authentication → Providers**, enable Email.
5. In **Authentication → URL Configuration**, add the deployed HTTPS website URL to Site URL and Redirect URLs.
6. In **Storage**, confirm the public bucket `isoko-products` exists.

The project currently contains a Supabase publishable/anon key in `script.js`. This key is intended for browser use; access is controlled by RLS. Never place a service-role key in frontend files.\n\n## WhatsApp merchant invitations\nOn the home page, open the Sell section, enter the merchant's Rwanda WhatsApp number and press **Fungura ubutumire kuri WhatsApp**. WhatsApp opens with a prepared invitation. The user must review it and press **Send**; a website cannot silently send messages from a personal WhatsApp account.

## 2. How to add products

1. Open the deployed site and choose **Tangira gucuruza / Start selling**.
2. Create an account or sign in.
3. Register your store: store name, description, district/location and WhatsApp number in international format, e.g. `2507XXXXXXXX`.
4. Fill the product form: name, description, RWF price, category, available stock and condition (new or occasion).
5. Select a JPG, PNG or WebP photo (maximum 5 MB), or provide a secure image URL.
6. Press **Bika igicuruzwa**. The item will be listed publicly after Supabase accepts it.

## 3. Buyer flow

Search or select a category, open the product list and add real seller listings to the cart. WhatsApp checkout currently supports products from one store at a time. The buyer and seller confirm availability, delivery, and payment arrangements directly. The website does not collect money or guarantee delivery.

## 4. Deploy to GitHub and Vercel

- Upload the contents of this folder to the root of the GitHub repository (so `index.html`, `script.js`, `style.css` and `schema.sql` are at the repository root).
- Import or reconnect that repository in Vercel.
- Use the project root as the Root Directory. No build command is required; this is a static site. Output Directory should be the project root / default.
- Deploy after running the Supabase SQL migration.

## 5. Important limitations and launch checks

- Sample products are examples only and are never stored as seller stock.
- Prices are RWF. Pi Network checkout is not enabled in this RWF marketplace build.
- WhatsApp checkout opens a message to the seller; it does not create a verified payment or delivery record.
- Confirm that store phone numbers belong to the sellers and that photos/descriptions/prices are accurate.
- Add a real monitored support contact and have the Privacy and Terms pages reviewed before public launch.
- Test account creation, sign-in, store registration, image upload, product publishing, search, cart and WhatsApp contact on a phone.

## Local check

Node.js 20+:

```bash
npm run check
```
