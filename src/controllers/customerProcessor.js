const Logger = require('../utils/logger');

class CustomerProcessor {
    constructor(evolutionService, databaseService, openRouterService) {
        this.evolutionService = evolutionService;
        this.databaseService = databaseService;
        this.openRouterService = openRouterService;
        this.logger = new Logger();
    }

    async processMessage(messageText, senderNumber) {
        try {
            this.logger.log(`Processing customer message from ${senderNumber}: ${messageText}`);

            const intent = await this.openRouterService.interpretIntent(messageText);
            
            switch (intent) {
                case 'price_query':
                    return await this.handlePriceQuery(messageText, senderNumber);
                case 'human_support':
                    return await this.handleHumanSupportRequest(messageText, senderNumber);
                case 'greeting':
                    return await this.handleGreeting(messageText, senderNumber);
                default:
                    return await this.handleGeneralQuery(messageText, senderNumber);
            }

        } catch (error) {
            this.logger.error('Error processing customer message:', error);
            await this.evolutionService.sendMessage(
                senderNumber,
                'Desculpe, tive um problema técnico. Tente novamente em alguns instantes.'
            );
            return { success: false, error: error.message };
        }
    }

    async handlePriceQuery(messageText, senderNumber) {
        try {
            const extractedItem = await this.openRouterService.extractItemFromQuery(messageText);
            
            if (extractedItem === 'não identificado') {
                return await this.handleGeneralQuery(messageText, senderNumber);
            }

            const item = await this.databaseService.findItem(extractedItem);
            
            if (item) {
                const responseMessage = `${item.item}: R$${item.price}\n\nPosso ajudar com mais alguma coisa? 😊`;
                await this.evolutionService.sendMessage(senderNumber, responseMessage);
                
                this.logger.log(`Price query resolved for ${senderNumber}: ${item.item} - R$${item.price}`);
                return { success: true, action: 'price_found', item };
            } else {
                const similarItems = await this.databaseService.findItems(extractedItem);
                
                if (similarItems.length > 0) {
                    let responseMessage = `Não tenho o preço exato para "${extractedItem}", mas tenho estas opções similares:\n\n`;
                    similarItems.slice(0, 3).forEach(similarItem => {
                        responseMessage += `• ${similarItem.item}: R$${similarItem.price}\n`;
                    });
                    responseMessage += `\nGostaria que um atendente verifique o preço específico para você?`;
                    
                    await this.evolutionService.sendMessage(senderNumber, responseMessage);
                    
                    this.logger.log(`Similar items found for ${senderNumber}: ${similarItems.length} items`);
                    return { success: true, action: 'similar_items_found', items: similarItems };
                } else {
                    const availableItems = await this.databaseService.getAllItems();
                    const response = await this.openRouterService.generateResponse(messageText, {
                        userMessage: messageText,
                        availableItems: availableItems,
                        isAdmin: false
                    });

                    await this.evolutionService.sendMessage(senderNumber, response.message);
                    
                    this.logger.log(`AI response for unknown item query from ${senderNumber}`);
                    return { success: true, action: 'ai_response_no_item' };
                }
            }

        } catch (error) {
            this.logger.error('Error handling price query:', error);
            return await this.handleGeneralQuery(messageText, senderNumber);
        }
    }

    async handleHumanSupportRequest(messageText, senderNumber) {
        try {
            const customerMessage = `🔔 *SOLICITAÇÃO DE ATENDIMENTO HUMANO*

📱 *Cliente:* +${senderNumber}
💬 *Mensagem:* ${messageText}
🕐 *Horário:* ${new Date().toLocaleString('pt-BR')}

O cliente está aguardando contato.`;

            await this.evolutionService.sendMessageToAdmin(customerMessage);

            const confirmationMessage = `Entendi! 👨‍💼

Um de nossos atendentes foi notificado e entrará em contato com você em breve.

Enquanto isso, posso ajudar com alguma consulta de preços? 😊`;

            await this.evolutionService.sendMessage(senderNumber, confirmationMessage);

            this.logger.log(`Human support requested by ${senderNumber}`);
            
            return { 
                success: true, 
                action: 'human_support_requested',
                adminNotified: true 
            };

        } catch (error) {
            this.logger.error('Error handling human support request:', error);
            
            const errorMessage = 'Desculpe, tive um problema ao processar sua solicitação. Tente novamente ou entre em contato diretamente.';
            await this.evolutionService.sendMessage(senderNumber, errorMessage);
            
            return { success: false, error: error.message };
        }
    }

    async handleGreeting(messageText, senderNumber) {
        try {
            const greetingMessage = `Olá! 👋 Bem-vindo à nossa assistência técnica!

Sou seu assistente virtual e posso ajudar você com:

🔍 *Consultar preços* de peças e serviços
👨‍💼 *Solicitar atendimento* humano
❓ *Tirar dúvidas* sobre reparos

Como posso ajudar você hoje? 😊`;

            await this.evolutionService.sendMessage(senderNumber, greetingMessage);

            this.logger.log(`Greeting sent to ${senderNumber}`);
            
            return { success: true, action: 'greeting_sent' };

        } catch (error) {
            this.logger.error('Error handling greeting:', error);
            return await this.handleGeneralQuery(messageText, senderNumber);
        }
    }

    async handleGeneralQuery(messageText, senderNumber) {
        try {
            const availableItems = await this.databaseService.getAllItems();
            
            const response = await this.openRouterService.generateResponse(messageText, {
                userMessage: messageText,
                availableItems: availableItems,
                isAdmin: false
            });

            if (response.success) {
                await this.evolutionService.sendMessage(senderNumber, response.message);
                this.logger.log(`General query processed for ${senderNumber}`);
                
                return { 
                    success: true, 
                    action: 'general_response',
                    aiResponse: response.message 
                };
            } else {
                const fallbackMessage = `Desculpe, não consegui processar sua mensagem no momento. 😔

Você pode:
• Perguntar sobre preços de peças específicas
• Solicitar atendimento humano digitando "quero falar com atendente"

Como posso ajudar? 😊`;

                await this.evolutionService.sendMessage(senderNumber, fallbackMessage);
                
                this.logger.error(`Failed to process general query from ${senderNumber}: ${response.error}`);
                
                return { 
                    success: false, 
                    action: 'fallback_response',
                    error: response.error 
                };
            }

        } catch (error) {
            this.logger.error('Error in general query handler:', error);
            
            const errorMessage = 'Desculpe, tive um problema técnico. Tente novamente ou solicite atendimento humano.';
            await this.evolutionService.sendMessage(senderNumber, errorMessage);
            
            return { success: false, error: error.message };
        }
    }

    async notifyAdminOfNewCustomer(senderNumber, firstMessage) {
        try {
            const notificationMessage = `📝 *NOVO CLIENTE*

📱 *Número:* +${senderNumber}
💬 *Primeira mensagem:* ${firstMessage}
🕐 *Horário:* ${new Date().toLocaleString('pt-BR')}

Cliente iniciou conversa com o bot.`;

            await this.evolutionService.sendMessageToAdmin(notificationMessage);
            
            this.logger.log(`Admin notified of new customer: ${senderNumber}`);
            
        } catch (error) {
            this.logger.error('Error notifying admin of new customer:', error);
        }
    }
}

module.exports = CustomerProcessor;