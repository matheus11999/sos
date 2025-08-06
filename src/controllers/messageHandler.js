const EvolutionService = require('../services/evolution');
const OpenRouterService = require('../services/openrouter');
const DatabaseService = require('../services/database');
const CustomerProcessor = require('./customerProcessor');
const ConfigService = require('../config/config');
const Logger = require('../utils/logger');

class MessageHandler {
    constructor() {
        this.evolutionService = new EvolutionService();
        this.openRouterService = new OpenRouterService();
        this.databaseService = new DatabaseService();
        this.configService = new ConfigService();
        this.customerProcessor = new CustomerProcessor(this.evolutionService, this.databaseService, this.openRouterService);
        this.logger = new Logger();
    }

    async getAdminPhoneNumber() {
        const config = await this.configService.getConfig();
        return config.ownerPhone || process.env.ADMIN_PHONE_NUMBER;
    }

    async handleIncomingMessage(messageData) {
        try {
            if (!this.evolutionService.isValidMessage(messageData)) {
                this.logger.log('Invalid message format received');
                return { success: false, error: 'Invalid message format' };
            }

            const messageText = this.evolutionService.extractMessageText(messageData);
            const senderNumber = this.evolutionService.extractSenderNumber(messageData);
            const adminNumber = await this.getAdminPhoneNumber();
            const isFromAdmin = senderNumber === adminNumber;

            this.logger.log(`Message received from ${senderNumber}: ${messageText}`);

            // Todas as mensagens são processadas como cliente (sem funções admin via WhatsApp)
            const result = await this.customerProcessor.processMessage(messageText, senderNumber);

            this.logger.logMessageProcessing(senderNumber, messageText, isFromAdmin, result);
            return result;

        } catch (error) {
            this.logger.error('Error handling incoming message:', error);
            return { success: false, error: error.message };
        }
    }

    async handleWebhook(req, res) {
        try {
            const webhookData = req.body;
            
            if (webhookData.event === 'messages.upsert') {
                // Verificar estrutura da mensagem
                let messageData = webhookData.data;
                
                // Verificar se é mensagem de grupo - ignorar completamente
                const remoteJid = messageData?.key?.remoteJid;
                if (remoteJid && remoteJid.includes('@g.us')) {
                    this.logger.logGroupIgnored(remoteJid);
                    res.status(200).json({ status: 'success', message: 'Group message ignored' });
                    return;
                }
                
                // Verificar se é uma mensagem válida (texto)
                if (!this.evolutionService.isValidMessage(messageData)) {
                    // Mensagem não é texto (pode ser imagem, áudio, etc.)
                    res.status(200).json({ status: 'success', message: 'Non-text message ignored' });
                    return;
                }
                
                const result = await this.handleIncomingMessage(messageData);
                
                if (result.success) {
                    res.status(200).json({ status: 'success', message: 'Message processed' });
                } else {
                    res.status(500).json({ status: 'error', message: result.error });
                }
            } else if (webhookData.event === 'connection.update') {
                this.logger.log('Connection update received:', webhookData.data);
                res.status(200).json({ status: 'success', message: 'Connection update received' });
            } else {
                res.status(200).json({ status: 'success', message: 'Event not handled' });
            }

        } catch (error) {
            this.logger.error('Error handling webhook:', error);
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    async sendTestMessage(phoneNumber, message) {
        try {
            const result = await this.evolutionService.sendMessage(phoneNumber, message);
            this.logger.log(`Test message sent to ${phoneNumber}: ${result.success ? 'Success' : 'Failed'}`);
            return result;
        } catch (error) {
            this.logger.error('Error sending test message:', error);
            return { success: false, error: error.message };
        }
    }

    async getInstanceStatus() {
        try {
            const result = await this.evolutionService.getInstanceInfo();
            return result;
        } catch (error) {
            this.logger.error('Error getting instance status:', error);
            return { success: false, error: error.message };
        }
    }

    async connectInstance() {
        try {
            const result = await this.evolutionService.connectInstance();
            this.logger.log('Instance connection attempt:', result.success ? 'Success' : 'Failed');
            return result;
        } catch (error) {
            this.logger.error('Error connecting instance:', error);
            return { success: false, error: error.message };
        }
    }

    async getQRCode() {
        try {
            const result = await this.evolutionService.getQRCode();
            if (result.success) {
                this.logger.log('QR Code generated successfully');
            }
            return result;
        } catch (error) {
            this.logger.error('Error getting QR code:', error);
            return { success: false, error: error.message };
        }
    }

    async setWebhook(webhookUrl) {
        try {
            const result = await this.evolutionService.setWebhook(webhookUrl);
            this.logger.log(`Webhook set to ${webhookUrl}: ${result.success ? 'Success' : 'Failed'}`);
            return result;
        } catch (error) {
            this.logger.error('Error setting webhook:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = MessageHandler;