const axios = require('axios');
const Logger = require('../utils/logger');

class EvolutionService {
    constructor() {
        this.baseUrl = process.env.EVOLUTION_API_URL;
        this.apiKey = process.env.EVOLUTION_API_KEY;
        this.instanceName = process.env.EVOLUTION_INSTANCE_NAME;
        this.logger = new Logger();
    }

    async sendMessage(phoneNumber, message) {
        try {
            const url = `${this.baseUrl}/message/sendText/${this.instanceName}`;
            
            const payload = {
                number: phoneNumber,
                text: message
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.apiKey
                }
            });

            this.logger.logOutgoingMessage(phoneNumber, message, true);

            return {
                success: true,
                messageId: response.data.key?.id,
                data: response.data
            };

        } catch (error) {
            console.error('Error sending message via Evolution API:', error.response?.data || error.message);
            this.logger.logOutgoingMessage(phoneNumber, message, false);
            
            return {
                success: false,
                error: error.message,
                data: error.response?.data
            };
        }
    }

    async sendMessageToAdmin(message) {
        const adminNumber = process.env.ADMIN_PHONE_NUMBER;
        return await this.sendMessage(adminNumber, message);
    }

    async setWebhook(webhookUrl) {
        try {
            const url = `${this.baseUrl}/webhook/set/${this.instanceName}`;
            
            const payload = {
                url: webhookUrl,
                events: [
                    'MESSAGES_UPSERT',
                    'CONNECTION_UPDATE'
                ]
            };

            const response = await axios.post(url, payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': this.apiKey
                }
            });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('Error setting webhook:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getInstanceInfo() {
        try {
            const url = `${this.baseUrl}/instance/fetchInstances`;
            
            const response = await axios.get(url, {
                headers: {
                    'apikey': this.apiKey
                }
            });

            const instance = response.data.find(inst => inst.instance.instanceName === this.instanceName);
            
            return {
                success: true,
                data: instance
            };

        } catch (error) {
            console.error('Error getting instance info:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async connectInstance() {
        try {
            const url = `${this.baseUrl}/instance/connect/${this.instanceName}`;
            
            const response = await axios.get(url, {
                headers: {
                    'apikey': this.apiKey
                }
            });

            return {
                success: true,
                data: response.data
            };

        } catch (error) {
            console.error('Error connecting instance:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async getQRCode() {
        try {
            const url = `${this.baseUrl}/instance/qrcode/${this.instanceName}`;
            
            const response = await axios.get(url, {
                headers: {
                    'apikey': this.apiKey
                }
            });

            return {
                success: true,
                qrcode: response.data.qrcode,
                data: response.data
            };

        } catch (error) {
            console.error('Error getting QR code:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    formatPhoneNumber(phoneNumber) {
        let formatted = phoneNumber.replace(/\D/g, '');
        
        if (formatted.startsWith('55')) {
            return formatted + '@s.whatsapp.net';
        }
        
        if (formatted.startsWith('11') || formatted.startsWith('12') || formatted.startsWith('13')) {
            return '55' + formatted + '@s.whatsapp.net';
        }
        
        return formatted + '@s.whatsapp.net';
    }

    extractPhoneNumber(from) {
        return from.replace('@s.whatsapp.net', '').replace('@c.us', '');
    }

    isValidMessage(messageData) {
        return messageData && 
               messageData.messages && 
               messageData.messages.length > 0 &&
               messageData.messages[0].message &&
               (messageData.messages[0].message.conversation || 
                messageData.messages[0].message.extendedTextMessage?.text);
    }

    extractMessageText(messageData) {
        const message = messageData.messages[0].message;
        return message.conversation || message.extendedTextMessage?.text || '';
    }

    extractSenderNumber(messageData) {
        return this.extractPhoneNumber(messageData.messages[0].key.remoteJid);
    }

    isFromAdmin(senderNumber) {
        const adminNumber = process.env.ADMIN_PHONE_NUMBER.replace(/\D/g, '');
        const cleanSender = senderNumber.replace(/\D/g, '');
        
        return cleanSender === adminNumber || 
               cleanSender === adminNumber.substring(2) ||
               cleanSender === '55' + adminNumber;
    }
}

module.exports = EvolutionService;