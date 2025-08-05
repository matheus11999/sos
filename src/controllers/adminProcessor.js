const Logger = require('../utils/logger');

class AdminProcessor {
    constructor(evolutionService, databaseService, openRouterService) {
        this.evolutionService = evolutionService;
        this.databaseService = databaseService;
        this.openRouterService = openRouterService;
        this.logger = new Logger();
    }

    async processMessage(messageText, senderNumber) {
        try {
            this.logger.log(`Processing admin message from ${senderNumber}: ${messageText}`);

            const intent = await this.identifyAdminCommand(messageText);
            
            switch (intent.command) {
                case 'add':
                    return await this.handleAddItem(intent.params, senderNumber);
                case 'edit':
                    return await this.handleEditItem(intent.params, senderNumber);
                case 'remove':
                    return await this.handleRemoveItem(intent.params, senderNumber);
                case 'list':
                    return await this.handleListItems(senderNumber);
                case 'help':
                    return await this.handleAdminHelp(senderNumber);
                default:
                    return await this.handleRegularMessage(messageText, senderNumber);
            }

        } catch (error) {
            this.logger.error('Error processing admin message:', error);
            await this.evolutionService.sendMessage(
                senderNumber,
                'Erro interno do sistema. Tente novamente.'
            );
            return { success: false, error: error.message };
        }
    }

    async identifyAdminCommand(messageText) {
        const text = messageText.toLowerCase().trim();
        
        if (text.startsWith('adicionar ') || text.startsWith('add ')) {
            return this.parseAddCommand(messageText);
        }
        
        if (text.startsWith('editar ') || text.startsWith('edit ')) {
            return this.parseEditCommand(messageText);
        }
        
        if (text.startsWith('remover ') || text.startsWith('remove ') || text.startsWith('deletar ')) {
            return this.parseRemoveCommand(messageText);
        }
        
        if (text.includes('listar') || text.includes('list') || text === 'itens') {
            return { command: 'list', params: {} };
        }
        
        if (text.includes('ajuda') || text.includes('help') || text.includes('comandos')) {
            return { command: 'help', params: {} };
        }
        
        return { command: 'regular', params: { text: messageText } };
    }

    parseAddCommand(messageText) {
        const regex = /(?:adicionar|add)\s+(.+?)\s+r\$?\s*(\d+(?:[.,]\d+)?)/i;
        const match = messageText.match(regex);
        
        if (match) {
            const itemName = match[1].trim();
            const price = parseFloat(match[2].replace(',', '.'));
            
            return {
                command: 'add',
                params: { itemName, price }
            };
        }
        
        return { command: 'invalid', params: { originalText: messageText } };
    }

    parseEditCommand(messageText) {
        const regex = /(?:editar|edit)\s+(.+?)\s+r\$?\s*(\d+(?:[.,]\d+)?)/i;
        const match = messageText.match(regex);
        
        if (match) {
            const itemName = match[1].trim();
            const price = parseFloat(match[2].replace(',', '.'));
            
            return {
                command: 'edit',
                params: { itemName, price }
            };
        }
        
        return { command: 'invalid', params: { originalText: messageText } };
    }

    parseRemoveCommand(messageText) {
        const regex = /(?:remover|remove|deletar)\s+(.+)/i;
        const match = messageText.match(regex);
        
        if (match) {
            const itemName = match[1].trim();
            
            return {
                command: 'remove',
                params: { itemName }
            };
        }
        
        return { command: 'invalid', params: { originalText: messageText } };
    }

    async handleAddItem(params, senderNumber) {
        if (!params.itemName || !params.price) {
            await this.evolutionService.sendMessage(
                senderNumber,
                'Formato inválido. Use: "Adicionar [nome do item] R$[preço]"\n\nExemplo: Adicionar Frontal A13 R$250'
            );
            return { success: false, error: 'Invalid add format' };
        }

        const result = await this.databaseService.addItem(params.itemName, params.price);
        
        await this.evolutionService.sendMessage(senderNumber, result.message);
        
        this.logger.log(`Admin ${senderNumber} added item: ${params.itemName} - R$${params.price} - ${result.success ? 'Success' : 'Failed'}`);
        
        return { success: result.success, action: 'add', result };
    }

    async handleEditItem(params, senderNumber) {
        if (!params.itemName || !params.price) {
            await this.evolutionService.sendMessage(
                senderNumber,
                'Formato inválido. Use: "Editar [nome do item] R$[novo preço]"\n\nExemplo: Editar Frontal A13 R$300'
            );
            return { success: false, error: 'Invalid edit format' };
        }

        const result = await this.databaseService.updateItem(params.itemName, params.price);
        
        await this.evolutionService.sendMessage(senderNumber, result.message);
        
        this.logger.log(`Admin ${senderNumber} edited item: ${params.itemName} - R$${params.price} - ${result.success ? 'Success' : 'Failed'}`);
        
        return { success: result.success, action: 'edit', result };
    }

    async handleRemoveItem(params, senderNumber) {
        if (!params.itemName) {
            await this.evolutionService.sendMessage(
                senderNumber,
                'Formato inválido. Use: "Remover [nome do item]"\n\nExemplo: Remover Frontal A13'
            );
            return { success: false, error: 'Invalid remove format' };
        }

        const result = await this.databaseService.removeItem(params.itemName);
        
        await this.evolutionService.sendMessage(senderNumber, result.message);
        
        this.logger.log(`Admin ${senderNumber} removed item: ${params.itemName} - ${result.success ? 'Success' : 'Failed'}`);
        
        return { success: result.success, action: 'remove', result };
    }

    async handleListItems(senderNumber) {
        const itemsFormatted = await this.databaseService.getItemsFormatted();
        
        await this.evolutionService.sendMessage(senderNumber, itemsFormatted);
        
        this.logger.log(`Admin ${senderNumber} requested items list`);
        
        return { success: true, action: 'list' };
    }

    async handleAdminHelp(senderNumber) {
        const helpMessage = `*COMANDOS ADMINISTRATIVOS*

📝 *Adicionar item:*
Adicionar [nome] R$[preço]
Ex: Adicionar Frontal A13 R$250

✏️ *Editar preço:*
Editar [nome] R$[novo preço]
Ex: Editar Frontal A13 R$300

🗑️ *Remover item:*
Remover [nome do item]
Ex: Remover Frontal A13

📋 *Listar todos os itens:*
Listar itens

❓ *Ver esta ajuda:*
Ajuda ou Help

*Obs:* Você também pode conversar normalmente como um cliente para testar o sistema.`;

        await this.evolutionService.sendMessage(senderNumber, helpMessage);
        
        this.logger.log(`Admin ${senderNumber} requested help`);
        
        return { success: true, action: 'help' };
    }

    async handleRegularMessage(messageText, senderNumber) {
        const availableItems = await this.databaseService.getAllItems();
        
        const response = await this.openRouterService.generateResponse(messageText, {
            userMessage: messageText,
            availableItems: availableItems,
            isAdmin: true
        });

        if (response.success) {
            await this.evolutionService.sendMessage(senderNumber, response.message);
            this.logger.log(`Admin ${senderNumber} regular message processed successfully`);
        } else {
            await this.evolutionService.sendMessage(senderNumber, 'Desculpe, tive um problema técnico. Tente novamente.');
            this.logger.error(`Failed to process regular admin message from ${senderNumber}`);
        }

        return { success: response.success, action: 'regular_message' };
    }
}

module.exports = AdminProcessor;