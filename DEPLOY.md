# Deploying Blacktivity

Everything below needs credentials or accounts only you have. The code is
ready; these are the steps that cannot be done for you.

## 1. Push the repo

A git repo is initialised locally with an initial commit. `.env.local` is
gitignored and was verified not to be staged.

```bash
git remote add origin git@github.com:<you>/blacktivity.git
git push -u origin main
```

## 2. Import to Vercel

New Project → import the repo. Framework preset is detected automatically.

## 3. Environment variables

Set every key from `.env.example` in Vercel (Production **and** Preview):

| Key | Notes |
|---|---|
| `MONGODB_URI` | Atlas. Not the in-memory dev instance. Allow Vercel's egress in Atlas Network Access. |
| `JWT_SECRET` | 32+ random bytes. `openssl rand -base64 48` |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Seeds the single admin account |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | See §5 — the current key is disabled |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Same value as `CLOUDINARY_CLOUD_NAME`. It was blank locally, which silently breaks the client uploader. |
| `ANALYTICS_SALT` | Rotates the visitor hash daily |
| `CRON_SECRET` | `openssl rand -hex 24`. The rollup route rejects anything without it. |
| `NEXT_PUBLIC_SITE_URL` | The deployed origin. Drives canonicals, OG images and the sitemap — there is no hard-coded domain. |

## 4. Cron

`vercel.json` already registers the daily rollup:

```json
{ "crons": [{ "path": "/api/cron/rollup", "schedule": "0 2 * * *" }] }
```

Vercel sends `Authorization: Bearer $CRON_SECRET` automatically. Verified
locally: without the header the route returns **401**; with it, **200**.

Hobby tier allows one cron run per day, which is exactly what this needs.

## 5. Cloudinary — currently blocked

The signing route works and is auth-guarded, but the key in `.env.local` is
rejected by Cloudinary itself:

```
GET /v1_1/<cloud>/resources/image  ->  401 {"error":{"message":"disabled api_key"}}
```

Issue a new API key in the Cloudinary console (Settings → Access Keys), set the
three variables, then confirm end to end by uploading a cover through
`/admin/articles/new` and checking the delivered URL, transformation and format.
Until then the admin image uploader falls back to pasting URLs.

## 6. Seed production

```bash
SEED_ALLOW_REMOTE=yes MONGODB_URI="<atlas uri>" npm run seed
```

`npm run seed` is destructive — it calls `deleteMany({})` on every collection
and refuses non-local hosts without that flag. Run it **once**, before there is
real content.

## 7. Measure the deployed URL

```bash
npx lighthouse <preview-url> --form-factor=mobile --screenEmulation.mobile \
  --throttling-method=devtools --only-categories=performance
```

Use `devtools` throttling, not the default `simulate` — see the README.
Then run PageSpeed Insights against the same URL for the emulated mid-range
Android profile, and check the admin dashboard's Core Web Vitals panel once
real traffic arrives.
