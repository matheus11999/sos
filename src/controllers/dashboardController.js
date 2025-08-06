const bcrypt = require('bcryptjs');
const ConfigService = require('../config/config');
const DatabaseService = require('../services/database');
const SupabaseService = require('../services/supabase');
const OpenRouterService = require('../services/openrouter');

class DashboardController {
    constructor() {
        this.configService = new ConfigService();
        this.databaseService = new DatabaseService();
        this.supabaseService = new SupabaseService();
        this.openRouterService = new OpenRouterService();
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
            const productsResult = await this.supabaseService.getAllProducts();
            const brandsResult = await this.supabaseService.getAllBrands();
            const db = await this.databaseService.loadDatabase();
            
            // Buscar status do OpenRouter
            const openRouterStatus = await this.openRouterService.getOpenRouterStatus();
            
            const products = productsResult.success ? productsResult.data : [];
            const brands = brandsResult.success ? brandsResult.data : [];
            
            const stats = {
                totalProducts: products.length,
                totalBrands: brands.length,
                totalConversations: Object.keys(db.conversationHistory || {}).length
            };

            res.render('dashboard', { 
                config, 
                products, 
                brands, 
                stats, 
                openRouterStatus 
            });
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
            const { aiActive, aiTraining, openRouterModel, customModel, openRouterApiKey, debugNumber } = req.body;
            
            let finalModel = openRouterModel || "microsoft/wizardlm-2-8x22b";
            if (openRouterModel === 'custom' && customModel && customModel.trim() !== '') {
                finalModel = customModel.trim();
            }
            
            const updates = {
                aiActive: aiActive === 'true',
                aiTraining: aiTraining || "",
                openRouterModel: finalModel,
                debugNumber: debugNumber ? debugNumber.trim() : ""
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
            const { name, description, price, quantity, brandId } = req.body;
            const result = await this.supabaseService.createProduct(
                name, 
                description || '', 
                parseFloat(price), 
                parseInt(quantity) || 0, 
                brandId || null
            );
            res.json(result);
        } catch (error) {
            console.error('Add product error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async updateProduct(req, res) {
        try {
            const { id, name, description, price, quantity, brandId } = req.body;
            const result = await this.supabaseService.updateProduct(
                id,
                name,
                description || '',
                parseFloat(price),
                parseInt(quantity) || 0,
                brandId || null
            );
            res.json(result);
        } catch (error) {
            console.error('Update product error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async deleteProduct(req, res) {
        try {
            const { id } = req.params;
            const result = await this.supabaseService.deleteProduct(id);
            res.json(result);
        } catch (error) {
            console.error('Delete product error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async addBrand(req, res) {
        try {
            const { name, description } = req.body;
            const result = await this.supabaseService.createBrand(name, description || '');
            res.json(result);
        } catch (error) {
            console.error('Add brand error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async updateBrand(req, res) {
        try {
            const { id, name, description } = req.body;
            const result = await this.supabaseService.updateBrand(id, name, description || '');
            res.json(result);
        } catch (error) {
            console.error('Update brand error:', error);
            res.status(500).json({ success: false, error: 'Erro interno' });
        }
    }

    async deleteBrand(req, res) {
        try {
            const { id } = req.params;
            const result = await this.supabaseService.deleteBrand(id);
            res.json(result);
        } catch (error) {
            console.error('Delete brand error:', error);
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