require('dotenv').config();
const express = require('express');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path = require('path');
const MessageHandler = require('./controllers/messageHandler');
const DashboardController = require('./controllers/dashboardController');
const OpenRouterService = require('./services/openrouter');
const Logger = require('./utils/logger');

const app = express();
const port = process.env.PORT || 3000;
const messageHandler = new MessageHandler();
const dashboardController = new DashboardController();
const logger = new Logger();

// Configurações de middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Configuração da sessão
app.use(session({
    secret: process.env.SESSION_SECRET || 'dashboard-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 horas
    }
}));

// Rate limiting para login
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 tentativas por IP
    message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    skipSuccessfulRequests: true
});

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

// Endpoint específico para Evolution API 2
app.post('/webhook/messages-upsert', async (req, res) => {
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

// Rotas do Dashboard
app.get('/dashboard/login', (req, res) => dashboardController.loginPage(req, res));
app.post('/dashboard/login', loginLimiter, (req, res) => dashboardController.authenticate(req, res));
app.get('/dashboard', dashboardController.requireAuth.bind(dashboardController), (req, res) => dashboardController.dashboard(req, res));
app.post('/dashboard/config', dashboardController.requireAuth.bind(dashboardController), (req, res) => dashboardController.updateConfig(req, res));
app.post('/dashboard/ai-config', dashboardController.requireAuth.bind(dashboardController), (req, res) => dashboardController.updateAIConfig(req, res));
app.post('/dashboard/product', dashboardController.requireAuth.bind(dashboardController), (req, res) => dashboardController.addProduct(req, res));
app.put('/dashboard/product', dashboardController.requireAuth.bind(dashboardController), (req, res) => dashboardController.updateProduct(req, res));
app.delete('/dashboard/product/:name', dashboardController.requireAuth.bind(dashboardController), (req, res) => dashboardController.deleteProduct(req, res));
app.post('/dashboard/logout', dashboardController.requireAuth.bind(dashboardController), (req, res) => dashboardController.logout(req, res));

app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
    });
});

app.use((req, res) => {
    if (req.path.startsWith('/dashboard')) {
        res.redirect('/dashboard/login');
    } else {
        res.status(404).json({ error: 'Endpoint not found' });
    }
});

app.use((error, req, res, next) => {
    logger.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

async function startServer() {
    try {
        logger.log('Starting WhatsApp Tech Support Bot...');
        
        const requiredEnvVars = [
            'EVOLUTION_API_URL',
            'EVOLUTION_API_KEY',
            'EVOLUTION_INSTANCE_NAME'
        ];
        
        const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
        
        if (missingVars.length > 0) {
            logger.error(`Missing required environment variables: ${missingVars.join(', ')}`);
            logger.error('Please copy .env.example to .env and fill in the required values');
            process.exit(1);
        }
        
        // Testar conexão com OpenRouter
        logger.log('Testing OpenRouter API connection...');
        const openRouterService = new OpenRouterService();
        try {
            const testResult = await openRouterService.generateResponse('test', {
                userMessage: 'test connection',
                availableItems: [],
                isAdmin: false
            });
            
            if (testResult.success) {
                logger.log('✅ OpenRouter API connection successful');
            } else {
                logger.error('❌ OpenRouter API connection failed:', testResult.error);
                logger.error('Check your OPEN_ROUTER_API_KEY in .env file');
            }
        } catch (error) {
            logger.error('❌ OpenRouter API connection error:', error.message);
            logger.error('Check your OPEN_ROUTER_API_KEY in .env file');
        }
        
        app.listen(port, () => {
            logger.log(`Server running on port ${port}`);
            logger.log('Available endpoints:');
            logger.log('  GET  / - Server status');
            logger.log('  POST /webhook - WhatsApp webhook (generic)');
            logger.log('  POST /webhook/messages-upsert - Evolution API 2 webhook');
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