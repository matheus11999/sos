const Logger = require('../utils/logger');
const ConfigService = require('../config/config');
const SupabaseService = require('../services/supabase');

class CustomerProcessor {
    constructor(evolutionService, databaseService, openRouterService) {
        this.evolutionService = evolutionService;
        this.databaseService = databaseService;
        this.openRouterService = openRouterService;
        this.configService = new ConfigService();
        this.supabaseService = new SupabaseService();
        this.logger = new Logger();
    }

    async processMessage(messageText, senderNumber) {
        try {
            // Verificar se a IA está pausada globalmente
            const config = await this.configService.getConfig();
            if (!config.aiActive) {
                this.logger.log(`AI is globally disabled. Ignoring message from ${senderNumber}.`);
                return { success: true, action: 'ai_globally_disabled' };
            }

            // Verificar modo debug - se configurado, só responder para o número específico
            if (config.debugNumber && config.debugNumber.trim() !== '') {
                const debugNumber = config.debugNumber.trim();
                if (senderNumber !== debugNumber) {
                    this.logger.log(`Debug mode active. Ignoring message from ${senderNumber}. Only responding to ${debugNumber}.`);
                    return { success: true, action: 'debug_mode_ignored' };
                }
                this.logger.log(`Debug mode active. Processing message from authorized number: ${senderNumber}`);
            }

            const isPaused = await this.databaseService.isPaused(senderNumber);
            if (isPaused) {
                this.logger.log(`AI is paused for ${senderNumber}. Ignoring message.`);
                return { success: true, action: 'ai_paused' };
            }

            this.logger.log(`Processing customer message from ${senderNumber}: ${messageText}`);

            const history = await this.databaseService.getConversationHistory(senderNumber);
            const intent = await this.openRouterService.interpretIntent(messageText);
            
            let result;
            switch (intent) {
                case 'price_query':
                    result = await this.handlePriceQuery(messageText, senderNumber, history);
                    break;
                case 'human_support':
                    result = await this.handleHumanSupportRequest(messageText, senderNumber);
                    break;
                case 'greeting':
                    result = await this.handleGreeting(messageText, senderNumber);
                    break;
                default:
                    result = await this.handleGeneralQuery(messageText, senderNumber, history);
                    break;
            }

            // Save context after processing, using the raw message for history
            if (result.rawResponse) {
                await this.databaseService.addMessageToHistory(senderNumber, 'user', messageText);
                await this.databaseService.addMessageToHistory(senderNumber, 'assistant', result.rawResponse);
            }

            return result;

        } catch (error) {
            this.logger.error('Error processing customer message:', error);
            await this.evolutionService.sendMessage(
                senderNumber,
                'Desculpe, tive um problema técnico. Tente novamente em alguns instantes.'
            );
            return { success: false, error: error.message };
        }
    }

    async handlePriceQuery(messageText, senderNumber, history) {
        try {
            const extractedItem = await this.openRouterService.extractItemFromQuery(messageText);
            
            if (extractedItem === 'não identificado') {
                return await this.handleGeneralQuery(messageText, senderNumber, history);
            }

            const itemResult = await this.supabaseService.findProduct(extractedItem);
            
            if (itemResult.success && itemResult.data) {
                const item = itemResult.data;
                const brandName = item.brands ? ` (${item.brands.name})` : '';
                const stockInfo = item.quantity > 0 ? `\n📦 Em estoque: ${item.quantity} unidades` : '\n⚠️ Estoque esgotado';
                const responseMessage = `*${item.name}${brandName}*: R$${item.price.toFixed(2)}${stockInfo}\n\nPosso ajudar com mais alguma coisa? 😊`;
                await this.evolutionService.sendMessage(senderNumber, responseMessage);
                
                this.logger.log(`Price query resolved for ${senderNumber}: ${item.name} - R$${item.price}`);
                return { success: true, action: 'price_found', item, rawResponse: responseMessage };
            } else {
                const responseMessage = `No momento, não temos *"${extractedItem}"* em estoque, mas podemos fazer o pedido para você! O prazo de chegada é de 4 a 5 dias úteis. Deseja encomendar?`;
                await this.evolutionService.sendMessage(senderNumber, responseMessage);
                this.logger.log(`Item not found for ${senderNumber}, offered to order.`);
                return { success: true, action: 'item_not_found_order_offered', rawResponse: responseMessage };
            }

        } catch (error) {
            this.logger.error('Error handling price query:', error);
            return await this.handleGeneralQuery(messageText, senderNumber, history);
        }
    }

    async handleHumanSupportRequest(messageText, senderNumber) {
        try {
            await this.databaseService.pauseAI(senderNumber, 3);

            const customerMessage = `🔔 *SOLICITAÇÃO DE ATENDIMENTO HUMANO*\n\n📱 *Cliente:* +${senderNumber}\n💬 *Mensagem:* ${messageText}\n🕐 *Horário:* ${new Date().toLocaleString('pt-BR')}\n\nA IA foi pausada para este número por 3 dias.`;

            await this.evolutionService.sendMessageToAdmin(customerMessage);

            const confirmationMessage = `Entendi! 👨‍💼\n\nUm de nossos atendentes foi notificado e entrará em contato com você em breve.\n\nPara garantir que você receba o atendimento necessário, pausei minhas respostas automáticas para você por 3 dias.`;

            await this.evolutionService.sendMessage(senderNumber, confirmationMessage);

            this.logger.log(`Human support requested by ${senderNumber}. AI paused for 3 days.`);
            
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
            const greetingMessage = `Olá! 👋 Bem-vindo à nossa assistência técnica!\n\nSou seu assistente virtual e posso ajudar você com:\n\n🔍 *Consultar preços* de peças e serviços\n👨‍💼 *Solicitar atendimento* humano\n❓ *Tirar dúvidas* sobre reparos\n\nComo posso ajudar você hoje? 😊`;

            await this.evolutionService.sendMessage(senderNumber, greetingMessage);

            this.logger.log(`Greeting sent to ${senderNumber}`);
            
            return { success: true, action: 'greeting_sent', rawResponse: greetingMessage };

        } catch (error) {
            this.logger.error('Error handling greeting:', error);
            return await this.handleGeneralQuery(messageText, senderNumber, []);
        }
    }

    async handleGeneralQuery(messageText, senderNumber, history) {
        try {
            const productsResult = await this.supabaseService.getAllProducts();
            const availableItems = productsResult.success ? productsResult.data : [];
            
            const response = await this.openRouterService.generateResponse(messageText, {
                availableItems: availableItems,
                isAdmin: false,
                history: history
            });

            if (response.success) {
                await this.evolutionService.sendMessage(senderNumber, response.fullMessage);
                this.logger.log(`General query processed for ${senderNumber}`);
                
                return { 
                    success: true, 
                    action: 'general_response',
                    rawResponse: response.fullMessage 
                };
            } else {
                // Usar a mensagem de erro personalizada do OpenRouter
                const fallbackMessage = response.fullMessage || `Desculpe, não consegui processar sua mensagem no momento. 😔\n\nVocê pode:\n• Perguntar sobre preços de peças específicas\n• Solicitar atendimento humano digitando "quero falar com atendente"\n\nComo posso ajudar? 😊`;

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
            const notificationMessage = `📝 *NOVO CLIENTE*\n\n📱 *Número:* +${senderNumber}\n💬 *Primeira mensagem:* ${firstMessage}\n🕐 *Horário:* ${new Date().toLocaleString('pt-BR')}\n\nCliente iniciou conversa com o bot.`;

            await this.evolutionService.sendMessageToAdmin(notificationMessage);
            
            this.logger.log(`Admin notified of new customer: ${senderNumber}`);
            
        }
        catch (error) {
            this.logger.error('Error notifying admin of new customer:', error);
        }
    }
}

module.exports = CustomerProcessor;