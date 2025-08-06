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
        return {
            apiKey: config.openRouterApiKey || process.env.OPEN_ROUTER_API_KEY,
            model: config.openRouterModel || 'microsoft/wizardlm-2-8x22b',
            aiActive: config.aiActive !== false,
            aiTraining: config.aiTraining || "Você é um assistente de uma loja de assistência técnica de celulares. Seja prestativo, educado e direto.",
            assistanceName: config.assistanceName || "Tech Support Bot",
            workingHours: config.workingHours || "08:00-18:00"
        };
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
            
            // Verifica se a IA está ativa
            if (!config.aiActive) {
                return {
                    success: false,
                    message: 'Sistema temporariamente indisponível. Entre em contato com um atendente.',
                    error: 'AI disabled'
                };
            }

            const { availableItems, isAdmin = false, history = [] } = context;
            
            let systemPrompt = this.buildSystemPrompt(availableItems, isAdmin, config);
            
            const messages = [
                { role: 'system', content: systemPrompt },
                ...history,
                { role: 'user', content: message }
            ];

            const response = await axios.post(this.baseUrl, {
                model: config.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            }, {
                headers: {
                    'Authorization': `Bearer ${config.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://whatsapp-tech-support.com',
                    'X-Title': 'WhatsApp Tech Support Bot'
                }
            });

            const rawMessage = response.data.choices[0].message.content.trim();
            const signature = this.getSignature(config.assistanceName);

            return {
                success: true,
                rawMessage: rawMessage,
                fullMessage: rawMessage + signature,
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

    buildSystemPrompt(availableItems = [], isAdmin = false, config = {}) {
        let systemPrompt = config.aiTraining || `Você é um assistente virtual de uma assistência técnica de celulares. Seu papel é ajudar clientes a consultar preços de peças e serviços.`;
        
        systemPrompt += `

INFORMAÇÕES DA LOJA:
- Nome: ${config.assistanceName || 'Tech Support Bot'}
- Horário de Atendimento: ${config.workingHours || '08:00-18:00'}

INSTRUÇÕES IMPORTANTES:
1. **Use a formatação do WhatsApp para melhorar a legibilidade**:
   - Use asteriscos para negrito (ex: *Produto*).
   - Use underscores para itálico (ex: _Aviso importante_).
   - Use isso para destacar nomes de produtos, preços e informações importantes.
2. **Use o histórico da conversa para evitar perguntas repetitivas.** Se o cliente já informou o modelo do aparelho, não pergunte novamente.
3. Seja sempre educado, prestativo e profissional.
4. Responda de forma clara e objetiva em português brasileiro.
5. Se o cliente perguntar sobre preços, consulte a lista de itens disponíveis.
6. Se não encontrar o item solicitado, sugira itens similares ou ofereça ajuda de um atendente.
7. Se o cliente quiser falar com um atendente, seja receptivo e confirme que será providenciado.

`;

        if (availableItems && availableItems.length > 0) {
            systemPrompt += `ITENS E PREÇOS DISPONÍVEIS:
`;
            availableItems.forEach(item => {
                systemPrompt += `- *${item.item}*: R$${item.price}\n`;
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

        // Adicionar instruções personalizadas se existirem
        if (this.customInstructions) {
            systemPrompt += `
INSTRUÇÕES PERSONALIZADAS DA LOJA:
${this.customInstructions}

`;
        }

        systemPrompt += `EXEMPLOS DE INTERAÇÃO:
Cliente: "Qual o preço da frontal do A13?"
Você: "O valor para a *tela frontal do Galaxy A13* é de *R$250,00*. Posso ajudar com mais alguma coisa? 😊"

Cliente: "Quero falar com um atendente"
Você: "Claro! Vou notificar um atendente para entrar em contato com você. Aguarde um momento, por favor."

Cliente: "Quanto custa para trocar a bateria do J7?"
Você: "Não tenho o preço específico para a *bateria do J7*, mas temos a *bateria do J8* por *R$100*. Gostaria que um atendente verificasse o preço exato para o *J7*?"

Responda sempre de forma natural e humana, como se fosse um atendente real da loja, usando a formatação para destacar as informações.`;

        return systemPrompt;
    }

    async interpretIntent(message) {
        try {
            const config = await this.getConfig();
            
            const response = await axios.post(this.baseUrl, {
                model: config.model,
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
                    'Authorization': `Bearer ${config.apiKey}`,
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
            const config = await this.getConfig();
            
            const response = await axios.post(this.baseUrl, {
                model: config.model,
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
                    'Authorization': `Bearer ${config.apiKey}`,
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