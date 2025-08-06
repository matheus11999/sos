const fs = require('fs-extra');
const path = require('path');

class ConfigService {
    constructor() {
        this.configPath = path.join(__dirname, '../../config.json');
    }

    async loadConfig() {
        try {
            if (!await fs.exists(this.configPath)) {
                const defaultConfig = {
                    dashboardPassword: "$2a$10$hash", // senha padrão: admin123
                    assistanceName: "Tech Support Bot",
                    workingHours: "08:00-18:00",
                    ownerPhone: process.env.ADMIN_PHONE_NUMBER || "",
                    aiActive: true,
                    aiTraining: "Você é um assistente de uma loja de assistência técnica de celulares. Seja prestativo, educado e direto. Sempre consulte nossa lista de produtos e preços antes de responder sobre valores. Se não souber algo específico, seja honesto.",
                    openRouterModel: "microsoft/wizardlm-2-8x22b",
                    openRouterApiKey: "",
                    debugNumber: ""
                };
                await this.saveConfig(defaultConfig);
                return defaultConfig;
            }
            
            const config = await fs.readJson(this.configPath);
            return {
                dashboardPassword: "$2a$10$hash",
                assistanceName: "Tech Support Bot",
                workingHours: "08:00-18:00",
                ownerPhone: process.env.ADMIN_PHONE_NUMBER || "",
                aiActive: true,
                aiTraining: "Você é um assistente de uma loja de assistência técnica de celulares. Seja prestativo, educado e direto. Sempre consulte nossa lista de produtos e preços antes de responder sobre valores. Se não souber algo específico, seja honesto.",
                openRouterModel: "microsoft/wizardlm-2-8x22b",
                openRouterApiKey: "",
                debugNumber: "",
                ...config
            };
        } catch (error) {
            console.error('Error loading config:', error);
            return {};
        }
    }

    async saveConfig(config) {
        try {
            await fs.writeJson(this.configPath, config, { spaces: 2 });
            return true;
        } catch (error) {
            console.error('Error saving config:', error);
            return false;
        }
    }

    async updateConfig(updates) {
        const config = await this.loadConfig();
        const newConfig = { ...config, ...updates };
        return await this.saveConfig(newConfig);
    }

    async getConfig(key) {
        const config = await this.loadConfig();
        return key ? config[key] : config;
    }
}

module.exports = ConfigService;