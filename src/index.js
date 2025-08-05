require('dotenv').config();
const express = require('express');
const MessageHandler = require('./controllers/messageHandler');
const Logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3000;
const messageHandler = new MessageHandler();
const logger = new Logger();

app.use(express.json());

app.use((req, res, next) => {
    const startTime = Date.now();
    logger.logRequest(req);
    
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        logger.logResponse(res, responseTime);
    });
    
    next();
});

app.get('/', (req, res) => {
    res.json({
        message: 'WhatsApp Tech Support Bot is running',
        status: 'active',
        timestamp: new Date().toISOString()
    });
});

app.post('/webhook', async (req, res) => {
    try {
        logger.logWebhook(req.body);
        await messageHandler.handleWebhook(req, res);
    } catch (error) {
        logger.error('Webhook error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.post('/test/message', async (req, res) => {
    try {
        const { phoneNumber, message } = req.body;
        
        if (!phoneNumber || !message) {
            return res.status(400).json({ 
                error: 'phoneNumber and message are required' 
            });
        }
        
        const result = await messageHandler.sendTestMessage(phoneNumber, message);
        res.json(result);
    } catch (error) {
        logger.error('Test message error:', error);
        res.status(500).json({ error: 'Error sending test message' });
    }
});

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
    try {
        logger.log('Starting WhatsApp Tech Support Bot...');
        
        const requiredEnvVars = [
            'OPEN_ROUTER_API_KEY',
            'EVOLUTION_API_URL',
            'EVOLUTION_API_KEY',
            'EVOLUTION_INSTANCE_NAME',
            'ADMIN_PHONE_NUMBER'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
            logger.error('Please copy .env.example to .env and fill in the required values');
            process.exit(1);
        }
        
        app.listen(port, () => {
            logger.log(`Server running on port ${port}`);
            logger.log('Available endpoints:');
            logger.log('  GET  / - Server status');
            logger.log('  POST /webhook - WhatsApp webhook');
            logger.log('  POST /test/message - Send test message');
            logger.log('  GET  /health - Health check');
            logger.log('');
            logger.log('Bot is ready to receive messages!');
        });
        
        process.on('SIGINT', () => {
            logger.log('Received SIGINT, shutting down gracefully...');
            process.exit(0);
        });
        
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught exception:', error);
            process.exit(1);
        });
        
        process.on('unhandledRejection', (reason, promise) => {
            logger.error('Unhandled rejection at:', promise, 'reason:', reason);
        });
        
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();