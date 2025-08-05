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
                case 'pause':
                    return await this.handlePauseAI(intent.params, senderNumber);
                case 'resume':
                    return await this.handleResumeAI(intent.params, senderNumber);
                case 'list_paused':
                    return await this.handleListPaused(senderNumber);
                case 'pause_global':
                    return await this.handlePauseGlobal(senderNumber);
                case 'resume_global':
                    return await this.handleResumeGlobal(senderNumber);
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
        
        if (text === 'listar itens' || text === 'list') {
            return { command: 'list', params: {} };
        }

        if (text === 'pausar ia global') {
            return { command: 'pause_global', params: {} };
        }

        if (text === 'reativar ia global') {
            return { command: 'resume_global', params: {} };
        }

        if (text.startsWith('pausar ia ')) {
            const match = messageText.match(/pausar ia (\d+)/i);
            if (match) return { command: 'pause', params: { number: match[1] } };
        }

        if (text.startsWith('reativar ia ')) {
            const match = messageText.match(/reativar ia (\d+)/i);
            if (match) return { command: 'resume', params: { number: match[1] } };
        }

        if (text === 'ver pausados') {
            return { command: 'list_paused', params: {} };
        }
        
        if (text === 'ajuda' || text === 'help' || text === 'comandos') {
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

    async handlePauseAI(params, senderNumber) {
        if (!params.number) {
            await this.evolutionService.sendMessage(senderNumber, 'Formato inválido. Use: pausar ia [numero]');
            return { success: false, error: 'Invalid pause format' };
        }
        await this.databaseService.pauseAI(params.number, 9999); // Pause indefinitely
        await this.evolutionService.sendMessage(senderNumber, `IA pausada para o número ${params.number}.`);
        this.logger.log(`Admin ${senderNumber} paused AI for ${params.number}`);
        return { success: true, action: 'pause' };
    }

    async handleResumeAI(params, senderNumber) {
        if (!params.number) {
            await this.evolutionService.sendMessage(senderNumber, 'Formato inválido. Use: reativar ia [numero]');
            return { success: false, error: 'Invalid resume format' };
        }
        await this.databaseService.resumeAI(params.number);
        await this.evolutionService.sendMessage(senderNumber, `IA reativada para o número ${params.number}.`);
        this.logger.log(`Admin ${senderNumber} resumed AI for ${params.number}`);
        return { success: true, action: 'resume' };
    }

    async handleListPaused(senderNumber) {
        const pausedNumbers = await this.databaseService.getPausedNumbers();
        let message = '*Números com IA pausada:*\n\n';
        if (pausedNumbers.length === 0) {
            message = 'Nenhum número com a IA pausada no momento.';
        } else {
            pausedNumbers.forEach(p => {
                message += `- ${p.number} (pausado até: ${new Date(p.pausedUntil).toLocaleString('pt-BR')})\n`;
            });
        }
        await this.evolutionService.sendMessage(senderNumber, message);
        this.logger.log(`Admin ${senderNumber} requested paused numbers list`);
        return { success: true, action: 'list_paused' };
    }

    async handlePauseGlobal(senderNumber) {
        await this.databaseService.setGlobalPause(true);
        await this.evolutionService.sendMessage(senderNumber, '*A IA foi pausada globalmente.*\nNenhum cliente receberá respostas automáticas.');
        this.logger.log(`Admin ${senderNumber} paused AI globally`);
        return { success: true, action: 'pause_global' };
    }

    async handleResumeGlobal(senderNumber) {
        await this.databaseService.setGlobalPause(false);
        await this.evolutionService.sendMessage(senderNumber, '*A IA foi reativada globalmente.*\nClientes voltarão a receber respostas automáticas.');
        this.logger.log(`Admin ${senderNumber} resumed AI globally`);
        return { success: true, action: 'resume_global' };
    }

    async handleAdminHelp(senderNumber) {
        const isGlobalPaused = await this.databaseService.isGlobalPaused();
        const globalStatus = isGlobalPaused ? 'PAUSADA GLOBALMENTE' : 'ATIVA GLOBALMENTE';

        const helpMessage = `*COMANDOS ADMINISTRATIVOS*\n_Status da IA: ${globalStatus}_\n\n*Itens e Preços:*\n- *Adicionar [nome] R$[preço]*\n- *Editar [nome] R$[novo preço]*\n- *Remover [nome]*\n- *Listar itens*\n\n*Controle da IA:*\n- *Pausar ia global*\n- *Reativar ia global*\n- *Pausar ia [número]*\n- *Reativar ia [número]*\n- *Ver pausados*\n\n*Ajuda:*\n- *Ajuda* ou *Comandos*\n\n*Obs:* Você também pode conversar normalmente como um cliente para testar o sistema.`;

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