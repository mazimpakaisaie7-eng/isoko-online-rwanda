# Isoko Online Rwanda 🇷🇼 — v2.0

A mobile-first Rwandan marketplace frontend with Supabase authentication/data and a server-verified Pi Network User-to-App payment flow.

## Included

- Responsive marketplace home page, search and category filters.
- Public product and store listings.
- Email/password account registration and sign-in through Supabase Auth.
- Seller store registration and product publishing.
- Shopping cart with quantity controls.
- Pi Browser SDK authentication (`username`, `payments`).
- Server-side Pi identity verification (`GET /v2/me`).
- Pi U2A payment flow: server approval, Pioneer confirmation in Pi Wallet, server completion.
- Server-side order pricing from the database (the browser cannot choose the authoritative total).
- Supabase RLS policies and a public product image bucket definition.
- Privacy and Terms starter pages.

## Important: this ZIP is a deployable codebase, not an already activated Pi app

Pi Network must approve/register the app and issue its Server API Key and app wallet. The operator must configure Supabase, run the SQL migration, set Vercel secrets, deploy, test in Pi Sandbox, and complete Pi's production/domain checks. No ZIP can guarantee hackathon selection, Pi listing, income, USDT/Pi awards or payment approval.

## 1. Supabase setup

This project uses the existing Supabase project configured in `script.js`. The browser key in that file is a publishable/anon key; it is not a service-role secret.

1. Open the Supabase project dashboard.
2. Open **SQL Editor**.
3. Run the complete file `database/schema.sql`.
4. In **Authentication → Providers**, enable Email. Configure email confirmation and a real sender before public launch.
5. In **Authentication → URL Configuration**, add your deployed HTTPS site URL and the required redirect URLs.
6. In **Project Settings → API**, copy the project URL, publishable/anon key and service-role key. Never share or publish the service-role key.

The migration creates new `isoko_*` tables and does not delete the existing `stores` or `products` tables. Existing legacy records are not copied automatically; migrate only after reviewing their actual columns.

## 2. Pi Developer setup

Use the Pi Browser and the official Developer Portal: `https://develop.pinet.com`.

1. Register an app on **Pi Testnet** first. App network cannot be changed later, so use a separate Mainnet app for production if/when eligible.
2. Configure the app's development URL and open it through the Pi Sandbox.
3. Generate/copy the Server API Key from the app dashboard.
4. Keep the SDK in sandbox mode while testing. `CONFIG.piSandbox` in `script.js` is currently `true`.
5. Do not switch to `false` until the production app is registered, the production URL is approved, and a successful Sandbox test has been completed. Pi's production guide requires `sandbox: false` for production.

Official references:
- https://developers.minepi.com/docs/build-first-app/GettingStarted
- https://developers.minepi.com/docs/build-first-app/RegisterApp
- https://developers.minepi.com/docs/build-first-app/Sandbox
- https://developers.minepi.com/docs/build-first-app/Production
- https://developers.minepi.com/docs/accept-payment/Payments
- https://developers.minepi.com/docs/api-reference/PlatformAPI

## 3. Vercel deployment and secrets

Import the GitHub repository into Vercel (or upload this project). The static frontend is served from the project root and `/api` contains Vercel Node serverless functions.

In **Vercel → Project → Settings → Environment Variables**, set:

| Variable | Value |
|---|---|
| `PI_API_KEY` | Pi Developer Portal Server API Key (server secret) |
| `PI_API_BASE` | `https://api.minepi.com/v2` |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Your Supabase publishable/anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role secret (server only) |

Apply to Preview and Production as appropriate, save, then redeploy. Never put `PI_API_KEY` or `SUPABASE_SERVICE_ROLE_KEY` in HTML, CSS, `script.js`, GitHub, screenshots or chat messages.

API routes included:
- `POST /api/pi/auth` — verifies Pi access token using Pi `/v2/me`.
- `POST /api/orders-create` — verifies Supabase and Pi identities, loads product prices from Supabase and creates the order server-side.
- `POST /api/pi/approve` — checks order, amount, Pi UID and metadata before approval.
- `POST /api/pi/complete` — completes with Pi and marks the order paid only after Pi confirms completion.

## 4. Authentication and test steps

1. Deploy a Preview build.
2. Open the site through the Pi Sandbox URL configured in the Developer Portal.
3. Authorize the sandbox using Pi Utilities if prompted.
4. Create a test Isoko account and confirm email if enabled.
5. Register a test store and publish a test product.
6. Add the product to cart and use a small Test-Pi amount.
7. Confirm the server logs show successful order creation, Pi approval and Pi completion.
8. Confirm the matching `isoko_orders` row changes from `pending` to `paid` only after Pi returns a completed payment.
9. Test cancellation, insufficient test balance, wrong product/price, expired sessions and retry callbacks.

Do not use a real payment until the app has passed the official Sandbox and production checks and the operator has verified legal, age/eligibility and business requirements. A Pi payment is not a promise of a refund; test with Test-Pi first.

## 5. Current scope and remaining operator tasks

- Product images currently accept an HTTPS image URL. The SQL creates a public `isoko-products` bucket and owner-folder upload policy, but an in-app file picker/uploader is not yet wired.
- Delivery, stock management, refunds, seller payouts, customer dispute handling, admin moderation and order fulfillment workflows require additional business rules and implementation.
- Product price is denominated in Pi for checkout. Do not show a RWF conversion unless a reliable, legally appropriate pricing source and conversion policy are added.
- Privacy and Terms pages are starter templates. Add a monitored business contact address and obtain suitable local legal review before public launch.
- Existing `stores` and `products` tables are preserved; this version reads the new `isoko_stores` and `isoko_products` tables created by the migration.
- Pi payments require the Pi Browser and a registered app. Ordinary Chrome checkout cannot complete Pi SDK payments.

## 6. Local checks

Node.js 20+:

```bash
npm run check
```

The Vercel project should use Node.js 20 or later. No local `.env` file is included.
