# GetPaidFast

A Next.js 16 invoicing workspace for freelancers and independent businesses. Public site, Google sign-in through Supabase, account-owned cloud workspaces, and a $5 USD monthly Stripe subscription.

## Features

- Invoices and quotes, three PDF templates, logo upload, four document accents, six currencies.
- Clients, service catalog, taxes and discounts, deposits and partial-payment records.
- Dashboard by currency, overdue balances, search, duplicate, archive and restore.
- Quote status records and conversion to an invoice.
- Multipage PDF, CSV export, full JSON backup and import with validation.
- Free: 10 saved documents and branded PDFs. Pro: up to 2,000 documents and unbranded PDFs, within a 3 MB application workspace limit.
- Saved records synchronize with the signed-in account. Drafts and recovery copies remain in the browser. Revision checks prevent another device from silently overwriting newer records.

Client payments and quote responses are recorded manually. The app does not collect client invoice payments, send invoices, provide recurring invoice automation, connect banks, or provide accounting/tax compliance. Demo names and amounts are illustrative.

## Run and verify

Use Node.js 24, then `npm ci`, `npm test`, `npm run lint`, and `npm run build`. `npm run dev` starts local development. A local environment that restricts Turbopack's child process ports can use `npm run build -- --webpack`.

The test suite covers invoice arithmetic, payments, invalid imports, subscription ownership/expiry/renewal/refund rules, and multipage PDF content. A real charged purchase is a separate manual verification and is never implied by unit tests.

## Environment

Public values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Server values, never use a `NEXT_PUBLIC_` prefix:

- `APP_URL` — canonical production origin `https://getpaidfast.vercel.app`
- `SUPABASE_SECRET_KEY` — privileged key for signed webhook records and verified entitlement synchronization
- `STRIPE_SECRET_KEY`
- `STRIPE_PRICE_ID` — active USD 500 monthly recurring price
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PORTAL_CONFIGURATION_ID` — cancellation at period end, payment-method updates, invoice history
- `CRON_SECRET` — random bearer secret for the daily health check

Email/password actions are disabled unless `EMAIL_AUTH_ENABLED=true`. Do not enable public email authentication before configuring reliable SMTP and its confirmation/recovery flows. Google sign-in only requests identity, email and profile scopes.

## Supabase setup

Apply the SQL migrations in `supabase/migrations` in order. All private tables have row-level security. Workspace reads/writes belong to `auth.uid()`. Entitlement writes and webhook-event records are restricted to `service_role`. The health table contains a single nonprivate readiness marker.

In Authentication, enable Google using the dedicated GetPaidFast Google Cloud web client. Register Supabase's exact callback URL in that client. Set Site URL to the canonical production origin and allow only the app's exact `/auth/callback` return URL (plus explicitly needed local development callbacks). Keep nonce verification and email checks enabled.

## Billing

Checkout requires a signed-in owner. The monthly price, currency and interval are validated on the server. Account metadata binds each checkout and subscription to its owner. Checkout requests reuse an existing open session and have a bounded idempotency key to reduce duplicate subscriptions.

`POST /api/stripe-webhook` verifies Stripe's signature, retrieves the current subscription and applies an idempotent database update. Subscribe to checkout completion, subscription create/update/delete, invoice paid/payment failed, charge refunded and charge dispute created/closed events. Each event retrieves current Stripe payment state rather than trusting an event payload as entitlement. The service-role-only snapshot RPC stores a verified entitlement flag; database quotas also require that flag. Duplicate events and stale observations cannot overwrite a newer paid subscription. Retrying a failed event is safe.

Every clean PDF export rechecks the subscription with Stripe, including the current paid invoice and nonrefunded/nondisputed charges. Client flags and checkout query strings never grant Pro access. A verified paid invoice can synchronize its entitlement before a delayed webhook arrives. Cancellation stops renewal while retaining access through the paid period. Billing management is available from the account.

The legacy 24-hour Payment Link was audited (no completed sessions) and disabled on 2026-10-28. Existing one-time purchases must never be interpreted as monthly subscriptions.

The opt-in `scripts/e2e-billing.cjs` runner accepts only an explicitly approved private temporary credential file, requires a Stripe test key and the expected test account, creates labeled disposable users, runs Checkout/portal/refund/time-travel scenarios, and removes its fixtures and credential file. It is not part of normal builds. On 2026-10-28, 13 integration assertions passed with no real charges. Stripe portal scheduling can use `cancel_at` rather than the older `cancel_at_period_end` flag; both are handled. The full run used the legacy flag after observing this portal difference; the actual portal response is also covered by a regression check.

The application rejects workspaces above 3 MB before saving, keeping normal JSON transfers below Vercel’s function payload ceiling. The database retains a separate 10 MB defensive ceiling. Number sequences are retained when records are removed, so deleting a document does not reuse its number.

## Health check

`vercel.json` schedules `/api/health` once daily. Vercel supplies `Authorization: Bearer CRON_SECRET`. The endpoint reads only the nonprivate readiness marker. Unauthorized requests fail. This checks database availability and creates legitimate application activity; it does not guarantee free-tier uptime or prevent provider policy changes.

## Search and AI discovery

Public pages render meaningful content on the server, with canonical URLs, descriptive titles, Open Graph imagery, a sitemap, robots rules, SoftwareApplication data and visible guide FAQs. Four guides cover invoices, quotes, templates and freelancer workflows. `/llms.txt` provides factual product information and limitations. Accounts, APIs, callbacks and demo pages are excluded from indexing. These measures improve crawlability; they do not guarantee rankings or inclusion in an AI answer.

## Deployment and recovery

The existing Vercel project is `gyozas-projects/getpaidfast`, linked to `JonathanDevred/invoice-tool` on `main`. Preserve the previous commit and deployment for rollback. Run checks before publishing, then verify production authentication, account isolation, persistence, PDF downloads, checkout pricing, signed webhooks and discovery endpoints. Hosting plans are managed separately; configuring this app never authorizes purchasing a hosting plan.

Support: `getpaidfast-app-support@googlegroups.com`. The Google Group accepts outside messages; conversations, membership and member email addresses remain private. Replies should use the group identity.
