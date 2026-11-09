# Aiven PostgreSQL backup and recovery

Confirm backup/PITR retention in the Aiven console; this repository does not claim backups are active. For recovery, restore to a target, restrict traffic, run `npm run db:migrate:status`, apply pending migrations, then verify users, inventory, orders, payments, deliveries and notifications. Reconcile Paystack records before reopening payments and keep the original database read-only until validation.
