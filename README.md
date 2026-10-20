# Neighbour Fix

An iPhone and Android app that matches Singapore homeowners with handymen who have been personally checked, with itemised quotes (labour, materials and fees on separate lines) before any work starts.

Built with Expo (React Native, SDK 58) and Supabase (Postgres with row-level security).

## What's in the app

| Tab | Who | What it does |
| --- | --- | --- |
| Book | Customers | Job-size ladder from quick fix to whole project, plus one-off jobs and emergencies. Each job shows the licence it needs and a typical price. |
| Renovate | Customers | Tick the work, get it arranged in trade order with an estimate and one checked pro per trade, then request real quotes. |
| Pros | Everyone | Checked pros with licence and check date, filtered by type and area. "Join as a pro" for handymen and suppliers. |
| My jobs | Customers and pros | Customers see quotes, rate finished jobs, cancel early requests and delete their account. Pros see jobs assigned to them. |
| Prices | Everyone | Home care plan, renovation coordination, booking fees, what neighbours paid (anonymous totals), parts reference prices, JB landed-cost check. |
| Board | Admin only | Approve pros after checking licence and references, match jobs, build itemised quotes, see earnings, edit fees. |

Who can see what is enforced in the database, not just the app (`supabase/schema.sql`):

- Customers see only their own jobs. They can rate a job once it's done and cancel one with no quote yet. They can't edit quotes.
- Pros see only jobs assigned to them, and can only update the quote and the job status.
- Applications to join are seen only by the applicant and admins. Only an admin can list a pro, and only after ticking the licence and reference checks.
- Signed-out visitors see the pro list, prices and plans, and anonymous price totals. They never see anyone's job or phone number.

`supabase/tests/rls_test.sql` checks each of these against a local Postgres.

## 1. The database

The Supabase project `neighbour-fix` (Singapore region) is already set up with the schema, access rules and example prices. Its public URL and publishable key are in `.env.example`.

Two steps are still yours, in the Supabase dashboard:

1. **SQL Editor**: paste and run the account-deletion function (the `delete_my_account` block near the end of `supabase/schema.sql`). Apple requires in-app account deletion; until this runs, the app's "Delete my account" button shows an error.
2. **Authentication → Emails → Magic Link**: make the email include `{{ .Token }}`, because the app signs people in with a 6-digit code.

After you sign in to the app once, make yourself the admin (use your email):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```

To rebuild from scratch in a new project, run `supabase/schema.sql` then `supabase/seed.sql` in the SQL Editor.

## 2. Run it on your iPhone (about 10 minutes)

You need Node.js on a computer and the free **Expo Go** app on your iPhone.

```bash
git clone https://github.com/yencwu87-ui/neighbour-fix-app
cd neighbour-fix-app
cp .env.example .env      # already holds the project's public URL and key
npm install
npx expo start
```

Scan the QR code with the iPhone camera. The app opens in Expo Go.

## 3. Put it on the App Store

1. **Enrol in the Apple Developer Program** at [developer.apple.com/programs](https://developer.apple.com/programs/). There's a yearly fee. Enrolling as an individual is fastest. Enrolling as a company needs a registered business and a D-U-N-S number, and shows the company name on the store.
2. **Change the app's ID if you want**: `ios.bundleIdentifier` in `app.json` is `sg.neighbourfix.app`. It must be unique on the App Store and can't change after the first upload.
3. **Build in the cloud** (no Mac needed):

   ```bash
   npx eas-cli@latest login
   npx eas-cli@latest build --platform ios --profile production
   ```

   EAS asks for your Apple account and creates the signing certificates for you.
4. **Submit**: `npx eas-cli@latest submit --platform ios`. Then test it yourself through TestFlight before releasing.
5. **App Store Connect listing** needs: app name, screenshots, a description, a support URL, a **privacy policy URL**, and the privacy questionnaire. This app collects name, email, phone number and job details, used to provide the service, not for tracking.

Android works the same way with `--platform android` and a Google Play developer account.

## Before real customers use it

- **Replace the examples**: everything tagged "Example" (rates, plan, fees) is a placeholder. Edit fees on the Board and rates in the `rates` table.
- **Business basics**: register the business with ACRA, publish a privacy policy that meets Singapore's PDPA, and write terms covering who is liable if a recommended pro does a bad job.
- **Licence checks**: plumbing needs a PUB licensed plumber, electrical a licensed electrical worker (EMA), aircon a BCA-trained technician, windows an approved window contractor, and pest control an NEA-registered vector control operator. Check each pro against the official register before approving.
- **Payments**: the app records fees and commission but doesn't take payment. Start with PayNow invoices. Adding in-app payments needs a payment provider and refund rules.

## Developer notes

```bash
npm run typecheck                                  # TypeScript, must be clean
npx expo export --platform ios                     # check the iOS bundle builds
psql -d <throwaway db> -f supabase/tests/rls_test.sql   # access rules, local Postgres
```

Routes live in `src/app` (Expo Router). Shared code is in `src/lib` and `src/components`.
