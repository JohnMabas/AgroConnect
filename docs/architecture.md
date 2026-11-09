# AgroConnect backend architecture

Node.js/Express/TypeScript API with Sequelize/Umzug and PostgreSQL. Feature modules own routes, validation and services; integrations isolate Paystack, Brevo, Africa's Talking and storage. Socket.IO is optional realtime delivery while PostgreSQL remains authoritative. The process starts after database connectivity and gracefully stops workers, sockets and the pool.
