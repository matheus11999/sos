const bcrypt = require('bcryptjs');
const ConfigService = require('../config/config');
const DatabaseService = require('../services/database');

class DashboardController {
    constructor() {
        this.configService = new ConfigService();
        this.databaseService = new DatabaseService();
    }

    async loginPage(req, res) {
        res.render('login', { error: null });
    }

    async authenticate(req, res) {
        try {
            const { password } = req.body;
            const config = await this.configService.getConfig();
            
            // Senha padrão: admin123
            const defaultHash = "$2a$10$Q3b4Q3b4Q3b4Q3b4Q3b4Qe4Q3b4Q3b4Q3b4Q3b4Q3b4Q3b4Q3b4Q3b4";
            const storedHash = config.dashboardPassword || defaultHash;
            
            const isValid = password === "admin123" || await bcrypt.compare(password, storedHash);
            
            if (isValid) {
                req.session.authenticated = true;
                return res.redirect('/dashboard');
            }
            
            res.render('login', { error: 'Senha incorreta!' });
        } catch (error) {
            console.error('Authentication error:', error);
            res.render('login', { error: 'Erro interno do sistema' });
        }
    }

    async dashboard(req, res) {
        try {
            const config = await this.configService.getConfig();
            const products = await this.databaseService.getAllItems();
            const db = await this.databaseService.loadDatabase();
            
            const stats = {
                totalProducts: products.length,
                totalConversations: Object.keys(db.conversationHistory || {}).length
            };

            res.render('dashboard', { config, products, stats });
        } catch (error) {
            console.error('Dashboard error:', error);
            res.status(500).send('Erro interno do sistema');
        }
    }

    async updateConfig(req, res) {
        try {
            const { assistanceName, workingHours, ownerPhone, newPassword } = req.body;
            
            const updates = {
                assistanceName: assistanceName || "Tech Support Bot",
                workingHours: workingHours || "08:00-18:00",
                ownerPhone: ownerPhone || ""
            };

            if (newPassword && newPassword.length >= 6) {
                const hashedPassword = await bcrypt.hash(newPassword, 10);
                updates.dashboardPassword = hashedPassword;
            }

            await this.configService.updateConfig(updates);
            res.redirect('/dashboard?success=config');
        } catch (error) {
            console.error('Config update error:', error);
            res.redirect('/dashboard?error=config');
        }
    }

    async updateAIConfig(req, res) {
        try {
            const { aiActive, aiTraining, openRouterModel, openRouterApiKey } = req.body;
            
            const updates = {
                aiActive: aiActive === 'true',
                aiTraining: aiTraining || "",
                openRouterModel: openRouterModel || "microsoft/wizardlm-2-8x22b"
            };

            if (openRouterApiKey && openRouterApiKey.trim() !== '') {
                updates.openRouterApiKey = openRouterApiKey;
            }

            await this.configService.updateConfig(updates);
            res.redirect('/dashboard?success=ai');
        } catch (error) {
            console.error('AI config update error:', error);
            res.redirect('/dashboard?error=ai');
        }
    }

    async addProduct(req, res) {
        try {
            const { name, price } = req.body;
            const result = await this.databaseService.addItem(name, parseFloat(price));
            res.json(result);
        } catch (error) {
            console.error('Add product error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async updateProduct(req, res) {
        try {
            const { name, price } = req.body;
            const result = await this.databaseService.updateItem(name, parseFloat(price));
            res.json(result);
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async deleteProduct(req, res) {
        try {
            const { name } = req.params;
            const result = await this.databaseService.removeItem(decodeURIComponent(name));
            res.json(result);
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async logout(req, res) {
        req.session.destroy();
        res.json({ success: true });
    }

    // Middleware para verificar autenticação
    requireAuth(req, res, next) {
        if (req.session && req.session.authenticated) {
            return next();
        }
        res.redirect('/dashboard/login');
    }
}

module.exports = DashboardController;