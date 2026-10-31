# Deploy / Live Server

## Local hot-reload live server

```bash
npm run setup
npm run live
```

Open: http://localhost:5173

Services:
- React/Vite: 5173
- FastAPI: 8000
- FX Node service: 3001

## Vercel

1. Push this folder to GitHub.
2. Import the repository in Vercel.
3. Keep the project Root Directory at the repository root.
4. `vercel.json` supplies the build/output settings.
5. Add payment environment variables in Project Settings → Environment Variables.
6. Deploy.

The production React app automatically calls same-origin endpoints:
- `/api/courses`
- `/api/payment-methods`
- `/api/fx?currency=KWD`
- `/api/orders`

## Netlify

1. Push this folder to GitHub.
2. Import the repository in Netlify.
3. Keep Base directory empty / repository root.
4. `netlify.toml` supplies the build, publish folder and function redirects.
5. Add payment environment variables in Site configuration → Environment variables.
6. Deploy.

## Payment variables

```env
VODAFONE_CASH_NUMBER=
ORANGE_CASH_NUMBER=
ETISALAT_CASH_NUMBER=
WE_PAY_NUMBER=
INSTAPAY_ADDRESS=
USDT_TRC20_ADDRESS=
USDT_BEP20_ADDRESS=
```

## Durable orders on serverless hosting

For local/Docker mode, FastAPI stores orders in SQLite.

For Vercel/Netlify serverless deployment, set:

```env
ORDER_WEBHOOK_URL=https://your-durable-order-receiver.example/webhook
```

The serverless order function forwards the validated order to this endpoint. Without a webhook, an Order ID is generated but the serverless deployment does not claim durable database storage.

## Production safety requirements

- The Vercel/Netlify deployment is a public catalog and request frontend; it does **not** provide the SQLite-backed accounts, admin dashboard, referrals, or support API. Host FastAPI with a durable database for those features and configure the frontend API origin accordingly.
- Set `ORDER_WEBHOOK_URL` to an **HTTPS** endpoint that validates and durably stores orders before acknowledging them. Without it, the serverless API returns HTTP 503 and does not claim a request was submitted.
- In FastAPI deployments, set a strong `JWT_SECRET`, and use `ADMIN_USER_IDS` (comma-separated verified internal user IDs) to grant admin access. **Never grant admin rights by an unverified sign-up email.**
- Google login uses verified Google ID tokens, not client-supplied email addresses. Configure matching `GOOGLE_CLIENT_ID` on FastAPI and `VITE_GOOGLE_CLIENT_ID` for the frontend build to enable it.
- Do not collect, submit, or store LMS passwords or university login credentials.
