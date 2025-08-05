const axios = require('axios');
const fs = require('fs');
const path = require('path');

class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPEN_ROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'z-ai/glm-4.5-air:free';
        this.customInstructions = this.loadCustomInstructions();
        this.signature = '\n\n---\nInteligencia Artificial S O S Celular\nPara falar com um atendente digite: Atendente';
    }

    loadCustomInstructions() {
        try {
            const instructionsPath = path.join(__dirname, '../../instructions.txt');
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
            const { userMessage, availableItems, isAdmin = false } = context;
            
            let systemPrompt = this.buildSystemPrompt(availableItems, isAdmin);
            
            const response = await axios.post(this.baseUrl, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: systemPrompt
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.7,
                max_tokens: 500
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://whatsapp-tech-support.com',
                    'X-Title': 'WhatsApp Tech Support Bot'
                }
            });

            const messageWithSignature = response.data.choices[0].message.content + this.signature;

            return {
                success: true,
                message: messageWithSignature,
                usage: response.data.usage
            };

        } catch (error) {
            console.error('Error calling OpenRouter API:', error.response?.data || error.message);
            return {
                success: false,
                message: 'Desculpe, estou com problemas técnicos no momento. Tente novamente em alguns instantes.',
                error: error.message
            };
        }
    }

    buildSystemPrompt(availableItems = [], isAdmin = false) {
        let systemPrompt = `Você é um assistente virtual de uma assistência técnica de celulares. Seu papel é ajudar clientes a consultar preços de peças e serviços.\n\nINSTRUÇÕES IMPORTANTES:\n1. Seja sempre educado, prestativo e profissional\n2. Responda de forma clara e objetiva\n3. Use português brasileiro\n4. Se o cliente perguntar sobre preços, consulte a lista de itens disponíveis\n5. Se não encontrar o item solicitado, sugira itens similares ou ofereça ajuda de um atendente\n6. Se o cliente quiser falar com um atendente, seja receptivo e confirme que será providenciado\n\n`;

        if (availableItems && availableItems.length > 0) {
            systemPrompt += `ITENS E PREÇOS DISPONÍVEIS:\n`;
            availableItems.forEach(item => {
                systemPrompt += `- ${item.item}: R${item.price}\n`;
            });
            systemPrompt += '\n';
        }

        if (isAdmin) {
            systemPrompt += `COMANDOS ADMINISTRATIVOS (apenas para admin):\n- "Adicionar [nome do item] R$[preço]" - para adicionar um novo item\n- "Editar [nome do item] R$[novo preço]" - para alterar preço\n- "Remover [nome do item]" - para remover um item\n- "Listar itens" - para ver todos os itens\n\n`;
        }

        // Adicionar instruções personalizadas se existirem
        if (this.customInstructions) {
            systemPrompt += `\nINSTRUÇÕES PERSONALIZADAS DA LOJA:\n${this.customInstructions}\n\n`;
        }

        systemPrompt += `EXEMPLOS DE INTERAÇÃO:\nCliente: "Qual o preço da frontal do A13?"\nVocê: "A frontal do A13 custa R$250. Posso ajudar com mais alguma coisa?"\n\nCliente: "Quero falar com um atendente"\nVocê: "Claro! Vou notificar um atendente para entrar em contato com você. Aguarde um momento, por favor."\n\nCliente: "Quanto custa para trocar a bateria do J7?"\nVocê: "Não tenho o preço específico para a bateria do J7, mas temos a bateria do J8 por R$100. Gostaria que um atendente verificasse o preço exato para o J7?"\n\nResponda sempre de forma natural e humana, como se fosse um atendente real da loja.`;

        return systemPrompt;
    }

    async interpretIntent(message) {
        try {
            const response = await axios.post(this.baseUrl, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `Você é um classificador de intenções para um sistema de atendimento. Analise a mensagem do usuário e retorne APENAS uma das opções:\n- "price_query" - se o usuário está perguntando sobre preço de peça ou serviço\n- "human_support" - se o usuário quer falar com atendente humano\n- "greeting" - se é uma saudação\n- "admin_command" - se parece ser um comando administrativo (adicionar, editar, remover, listar)\n- "other" - para outras situações\n\nRetorne APENAS a classificação, sem explicações.`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.1,
                max_tokens: 20
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://whatsapp-tech-support.com',
                    'X-Title': 'WhatsApp Tech Support Bot'
                }
            });

            return response.data.choices[0].message.content.trim().toLowerCase();

        } catch (error) {
            console.error('Error interpreting intent:', error);
            return 'other';
        }
    }

    async extractItemFromQuery(message) {
        try {
            const response = await axios.post(this.baseUrl, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `Extraia APENAS o nome da peça ou serviço mencionado na mensagem. Retorne de forma limpa, sem "do", "da", "de" desnecessários. \n\nExemplos:\n"Qual o preço da frontal do A13?" -> "frontal A13"\n"Quanto custa bateria J8?" -> "bateria J8" \n"Preço troca conector carga" -> "troca conector carga"\n\nSe não conseguir identificar, retorne "não identificado".`
                    },
                    {
                        role: 'user',
                        content: message
                    }
                ],
                temperature: 0.1,
                max_tokens: 50
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://whatsapp-tech-support.com',
                    'X-Title': 'WhatsApp Tech Support Bot'
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