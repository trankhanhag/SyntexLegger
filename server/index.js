/**
 * Server Entry Point
 * SyntexHCSN - Kế toán HCSN theo TT 24/2024/TT-BTC
 */

const db = require('./database');
const createApp = require('./app');

const PORT = process.env.PORT || 3000;

// Initialize App
const app = createApp(db);

// Start Server
const server = app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`   SyntexHCSN Backend Server is running!`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Mode: ${process.env.NODE_ENV || 'development'}`);
    console.log(`   Circular 24/2024/TT-BTC Compliance: ENABLED`);
    console.log(`===============================================`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
        console.log('HTTP server closed');
        db.close(() => {
            console.log('Database connection closed');
        });
    });
});
