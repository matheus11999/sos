const axios = require('axios');

class OpenRouterService {
    constructor() {
        this.apiKey = process.env.OPEN_ROUTER_API_KEY;
        this.baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
        this.model = 'zhipuai/glm-4.5-air-1m';
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

            return {
                success: true,
                message: response.data.choices[0].message.content,
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
        let systemPrompt = `Você é um assistente virtual de uma assistência técnica de celulares. Seu papel é ajudar clientes a consultar preços de peças e serviços.

INSTRUÇÕES IMPORTANTES:
1. Seja sempre educado, prestativo e profissional
2. Responda de forma clara e objetiva
3. Use português brasileiro
4. Se o cliente perguntar sobre preços, consulte a lista de itens disponíveis
5. Se não encontrar o item solicitado, sugira itens similares ou ofereça ajuda de um atendente
6. Se o cliente quiser falar com um atendente, seja receptivo e confirme que será providenciado

`;

        if (availableItems && availableItems.length > 0) {
            systemPrompt += `ITENS E PREÇOS DISPONÍVEIS:\n`;
            availableItems.forEach(item => {
                systemPrompt += `- ${item.item}: R$${item.price}\n`;
            });
            systemPrompt += '\n';
        }

        if (isAdmin) {
            systemPrompt += `COMANDOS ADMINISTRATIVOS (apenas para admin):
- "Adicionar [nome do item] R$[preço]" - para adicionar um novo item
- "Editar [nome do item] R$[novo preço]" - para alterar preço
- "Remover [nome do item]" - para remover um item
- "Listar itens" - para ver todos os itens

`;
        }

        systemPrompt += `EXEMPLOS DE INTERAÇÃO:
Cliente: "Qual o preço da frontal do A13?"
Você: "A frontal do A13 custa R$250. Posso ajudar com mais alguma coisa?"

Cliente: "Quero falar com um atendente"
Você: "Claro! Vou notificar um atendente para entrar em contato com você. Aguarde um momento, por favor."

Cliente: "Quanto custa para trocar a bateria do J7?"
Você: "Não tenho o preço específico para a bateria do J7, mas temos a bateria do J8 por R$100. Gostaria que um atendente verificasse o preço exato para o J7?"

Responda sempre de forma natural e humana, como se fosse um atendente real da loja.`;

        return systemPrompt;
    }

    async interpretIntent(message) {
        try {
            const response = await axios.post(this.baseUrl, {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: `Você é um classificador de intenções para um sistema de atendimento. Analise a mensagem do usuário e retorne APENAS uma das opções:
- "price_query" - se o usuário está perguntando sobre preço de peça ou serviço
- "human_support" - se o usuário quer falar com atendente humano
- "greeting" - se é uma saudação
- "admin_command" - se parece ser um comando administrativo (adicionar, editar, remover, listar)
- "other" - para outras situações

Retorne APENAS a classificação, sem explicações.`
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
                        content: `Extraia APENAS o nome da peça ou serviço mencionado na mensagem. Retorne de forma limpa, sem "do", "da", "de" desnecessários. 

Exemplos:
"Qual o preço da frontal do A13?" -> "frontal A13"
"Quanto custa bateria J8?" -> "bateria J8" 
"Preço troca conector carga" -> "troca conector carga"

Se não conseguir identificar, retorne "não identificado".`
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