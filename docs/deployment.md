# Render and Aiven deployment

Create Aiven PostgreSQL and download its CA. Create the backend from `render.yaml` (`backend` root); Render builds with `npm install && npm run build`, runs `npm run db:migrate` pre-deploy, then `npm start`. Set production variables from `backend/.env.example`, upload the CA as a Render secret file, configure Paystack webhook `/api/payments/paystack/webhook`, verified Brevo sender, Africa's Talking, and AI credentials as applicable. Verify `/api/health`, logs, CORS and shutdown before pilot traffic.
