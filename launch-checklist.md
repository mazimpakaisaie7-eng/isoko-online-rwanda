# Pre-launch checklist

- [ ] Confirm operator is eligible to create and operate the Pi app; follow Pi terms and any required adult supervision.
- [ ] Run `database/schema.sql` in the intended Supabase project.
- [ ] Confirm RLS is enabled and test with a non-owner account.
- [ ] Enable/configure Supabase email authentication and redirect URLs.
- [ ] Set all five Vercel environment variables from `.env.example` using real dashboard values.
- [ ] Register a Pi Testnet app in the Pi Developer Portal.
- [ ] Configure the Pi Sandbox development URL and test identity verification.
- [ ] Test payment approval, completion, cancellation, retry and amount mismatch.
- [ ] Confirm unpaid orders never become paid from a browser-only callback.
- [ ] Add verified operator contact details and review Privacy/Terms.
- [ ] Review product policies, customer support, delivery, refunds and dispute handling.
- [ ] Complete Pi production registration/domain verification before switching `piSandbox` to `false`.
- [ ] Never commit `.env`, Pi Server API Key, Supabase service-role key, wallet passphrases or private keys.
