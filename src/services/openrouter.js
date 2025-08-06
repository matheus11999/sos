const axios = require('axios');
const fs = require('fs');
const path = require('path');
const ConfigService = require('../config/config');

class OpenRouterService {
    constructor() {
        this.configService = new ConfigService();
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.customInstructions = this.loadCustomInstructions();
    }

    async getConfig() {
        const config = await this.configService.getConfig();
        
        // Priorizar SEMPRE as configurações do dashboard sobre as do .env
        const apiKey = config.openRouterApiKey || process.env.OPEN_ROUTER_API_KEY;
        const model = config.openRouterModel || process.env.OPEN_ROUTER_MODEL || 'microsoft/wizardlm-2-8x22b';
        
        if (!apiKey) {
            throw new Error('API Key do OpenRouter não configurada. Configure no dashboard em IA & OpenRouter.');
        }
        
        return {
            apiKey: apiKey,
            model: model,
            aiActive: config.aiActive !== false,
            aiTraining: config.aiTraining || "Você é um assistente de uma loja de assistência técnica de celulares. Seja prestativo, educado e direto.",
            assistanceName: config.assistanceName || "Tech Support Bot",
            workingHours: config.workingHours || "08:00-18:00"
        };
    }

    async getOpenRouterStatus() {
        try {
            const config = await this.getConfig();
            if (!config.apiKey) {
                return { 
                    success: false, 
                    error: 'API Key não configurada',
                    balance: null,
                    limits: null
                };
            }

            // Verificar créditos disponíveis
            const creditsResponse = await axios.get('https://openrouter.ai/api/v1/auth/key', {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            // Verificar limites do modelo
            const modelsResponse = await axios.get('https://openrouter.ai/api/v1/models', {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`
                }
            });

            const currentModel = modelsResponse.data.data.find(model => model.id === config.model);

            return {
                success: true,
                balance: creditsResponse.data.data.credit_left,
                limits: creditsResponse.data.data.rate_limit,
                model: {
                    id: config.model,
                    name: currentModel?.name || config.model,
                    context_length: currentModel?.context_length,
                    pricing: currentModel?.pricing
                },
                usage: creditsResponse.data.data.usage || 0
            };

        } catch (error) {
            console.error('Error getting OpenRouter status:', error.response?.data || error.message);
            return { 
                success: false, 
                error: error.response?.data?.error?.message || error.message,
                balance: null,
                limits: null
            };
        }
    }

    getSignature(assistanceName) {
        return `

---
*_Inteligencia Artificial ${assistanceName}_*
Para falar com um atendente digite: *Atendente*`;
    }

    loadCustomInstructions() {
        try {
            const instructionsPath = path.join(__dirname, '../../instructions.md');
            if (fs.existsSync(instructionsPath)) {
                return fs.readFileSync(instructionsPath, 'utf8');
            }
        } catch (error) {
            console.log('Arquivo de instruções personalizadas não encontrado, usando padrão.');
        }
        return '';
    }

    async generateResponse(message, context = {}) {
        try {
            const config = await this.getConfig();
            
            console.log(`[OpenRouter] Using model: ${config.model}`);
            console.log(`[OpenRouter] API Key configured: ${config.apiKey ? 'Yes' : 'No'}`);
            
            // Verifica se a IA está ativa
            if (!config.aiActive) {
                return {
                    success: false,
                    error: 'IA está desativada nas configurações'
                };
            }

            // Preparar dados dos produtos para contexto
            let productsContext = '';
            if (context.availableItems && context.availableItems.length > 0) {
                productsContext = '\n\nProdutos disponíveis na loja:\n';
                context.availableItems.forEach(item => {
                    const brandName = item.brands ? ` (${item.brands.name})` : '';
                    const stockInfo = item.quantity > 0 ? ` - ${item.quantity} em estoque` : ' - Sem estoque';
                    productsContext += `- ${item.name}${brandName}: R$${item.price.toFixed(2)}${stockInfo}\n`;
                });
            }

            // Preparar histórico da conversa
            let conversationHistory = [];
            if (context.history && context.history.length > 0) {
                conversationHistory = context.history.map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'assistant',
                    content: msg.content
                }));
            }

            const systemPrompt = `${config.aiTraining}

Nome da assistência: ${config.assistanceName}
Horário de funcionamento: ${config.workingHours}

${this.customInstructions}
${productsContext}

Instruções específicas:
- Seja sempre educado e prestativo
- Se perguntarem sobre preços, consulte a lista de produtos
- Se não souber uma informação, seja honesto
- Para questões complexas, sugira falar com atendente
- Use emojis moderadamente para ser mais amigável
- Mantenha respostas concisas mas completas`;

            const messages = [
                { role: 'system', content: systemPrompt },
                ...conversationHistory,
                { role: 'user', content: message }
            ];

            const response = await axios.post(this.baseUrl, {
                model: config.model,
                messages: messages,
                max_tokens: 500,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'X-Title': `${config.assistanceName} - WhatsApp Bot`
                }
            });

            const aiResponse = response.data.choices[0].message.content;
            const signature = this.getSignature(config.assistanceName);
            const fullMessage = aiResponse + signature;

            return {
                success: true,
                response: aiResponse,
                fullMessage: fullMessage,
                tokensUsed: response.data.usage?.total_tokens || 0,
                model: config.model
            };

        } catch (error) {
            console.error('Error generating response:', error.response?.data || error.message);
            
            let errorMessage = 'Desculpe, não consegui processar sua mensagem no momento. 😔\n\nVocê pode:\n* Perguntar sobre preços de peças específicas\n* Solicitar atendimento humano digitando "quero falar com atendente"\n\nComo posso ajudar? 😊';
            
            if (error.message.includes('API Key')) {
                errorMessage = '⚠️ Sistema temporariamente indisponível. Configure a API Key no dashboard.\n\nPara atendimento humano, digite: *Atendente*';
            }
            
            return {
                success: false,
                error: error.response?.data?.error?.message || error.message,
                fullMessage: errorMessage
            };
        }
    }

    async interpretIntent(message) {
        try {
            const lowerMessage = message.toLowerCase();
            
            // Verificar se é pedido de atendimento humano
            if (lowerMessage.includes('atendente') || 
                lowerMessage.includes('humano') || 
                lowerMessage.includes('pessoa') ||
                lowerMessage.includes('funcionário')) {
                return 'human_support';
            }

            // Verificar se é saudação
            if (lowerMessage.includes('oi') || 
                lowerMessage.includes('olá') || 
                lowerMessage.includes('bom dia') ||
                lowerMessage.includes('boa tarde') ||
                lowerMessage.includes('boa noite') ||
                lowerMessage.includes('hey') ||
                lowerMessage.includes('e aí')) {
                return 'greeting';
            }

            // Verificar se é consulta de preço
            if (lowerMessage.includes('preço') || 
                lowerMessage.includes('valor') || 
                lowerMessage.includes('custa') ||
                lowerMessage.includes('quanto') ||
                lowerMessage.includes('r$')) {
                return 'price_query';
            }

            return 'general_query';
        } catch (error) {
            console.error('Error interpreting intent:', error);
            return 'general_query';
        }
    }

    async extractItemFromQuery(message) {
        try {
            const config = await this.getConfig();
            
            if (!config.apiKey) {
                return 'não identificado';
            }

            const systemPrompt = `Você deve extrair APENAS o nome do produto que o cliente está perguntando sobre. 

Regras:
- Responda APENAS com o nome do produto (sem preços, sem explicações)
- Se não conseguir identificar um produto específico, responda: "não identificado"
- Produtos comuns: iPhone, Samsung Galaxy, Xiaomi, Motorola, etc.

Exemplos:
"quanto custa o iPhone 15?" -> iPhone 15
"preço do galaxy s24" -> Galaxy S24
"valor da tela do motorola" -> não identificado (muito genérico)
"oi, tudo bem?" -> não identificado`;

            const response = await axios.post(this.baseUrl, {
                model: config.model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
                max_tokens: 50,
                temperature: 0.3
            }, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.data.choices[0].message.content.trim();

        } catch (error) {
            console.error('Error extracting item:', error);
            return 'não identificado';
        }
    }
}

module.exports = OpenRouterService;