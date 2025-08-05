const fs = require('fs-extra');
const path = require('path');

class DatabaseService {
    constructor() {
        this.dbPath = path.join(__dirname, '../../database.json');
    }

    async loadDatabase() {
        try {
            if (!await fs.exists(this.dbPath)) {
                return { items: [], pausedNumbers: [] };
            }
            const data = await fs.readJson(this.dbPath);
            // Handle old format (array of items)
            if (Array.isArray(data)) {
                return { items: data, pausedNumbers: [] };
            }
            return data;
        } catch (error) {
            console.error('Error loading database:', error);
            return { items: [], pausedNumbers: [] };
        }
    }

    async saveDatabase(data) {
        try {
            await fs.writeJson(this.dbPath, data, { spaces: 2 });
            return true;
        } catch (error) {
            console.error('Error saving database:', error);
            return false;
        }
    }

    async findItem(searchTerm) {
        const db = await this.loadDatabase();
        const normalizedSearch = searchTerm.toLowerCase();
        
        return db.items.find(item => 
            item.item.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(item.item.toLowerCase())
        );
    }

    async findItems(searchTerm) {
        const db = await this.loadDatabase();
        const normalizedSearch = searchTerm.toLowerCase();
        
        return db.items.filter(item => 
            item.item.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(item.item.toLowerCase())
        );
    }

    async addItem(itemName, price) {
        const db = await this.loadDatabase();
        
        const existingItem = db.items.find(item => 
            item.item.toLowerCase() === itemName.toLowerCase()
        );
        
        if (existingItem) {
            return { success: false, message: 'Item já existe no banco de dados' };
        }

        const newItem = {
            item: itemName,
            price: parseFloat(price)
        };

        db.items.push(newItem);
        const saved = await this.saveDatabase(db);
        
        if (saved) {
            return { 
                success: true, 
                message: `Item '${itemName}' adicionado com sucesso por R${price}!`,
                item: newItem
            };
        } else {
            return { success: false, message: 'Erro ao salvar item no banco de dados' };
        }
    }

    async updateItem(itemName, newPrice) {
        const db = await this.loadDatabase();
        const itemIndex = db.items.findIndex(item => 
            item.item.toLowerCase() === itemName.toLowerCase()
        );
        
        if (itemIndex === -1) {
            return { success: false, message: 'Item não encontrado no banco de dados' };
        }

        const oldPrice = db.items[itemIndex].price;
        db.items[itemIndex].price = parseFloat(newPrice);
        
        const saved = await this.saveDatabase(db);
        
        if (saved) {
            return { 
                success: true, 
                message: `Preço do item '${itemName}' alterado de R${oldPrice} para R${newPrice}!`,
                item: db.items[itemIndex]
            };
        } else {
            return { success: false, message: 'Erro ao atualizar item no banco de dados' };
        }
    }

    async removeItem(itemName) {
        const db = await this.loadDatabase();
        const itemIndex = db.items.findIndex(item => 
            item.item.toLowerCase() === itemName.toLowerCase()
        );
        
        if (itemIndex === -1) {
            return { success: false, message: 'Item não encontrado no banco de dados' };
        }

        const removedItem = db.items[itemIndex];
        db.items.splice(itemIndex, 1);
        
        const saved = await this.saveDatabase(db);
        
        if (saved) {
            return { 
                success: true, 
                message: `Item '${removedItem.item}' removido com sucesso!`, 
                item: removedItem
            };
        } else {
            return { success: false, message: 'Erro ao remover item do banco de dados' };
        }
    }

    async getAllItems() {
        const db = await this.loadDatabase();
        return db.items;
    }

    async getItemsFormatted() {
        const db = await this.loadDatabase();
        if (db.items.length === 0) {
            return 'Nenhum item encontrado no banco de dados.';
        }

        let message = 'Itens disponíveis:\n\n';
        db.items.forEach((item, index) => {
            message += `${index + 1}. ${item.item}: R${item.price}\n`;
        });

        return message;
    }

    async isPaused(phoneNumber) {
        const db = await this.loadDatabase();
        const pausedInfo = db.pausedNumbers.find(p => p.number === phoneNumber);
        if (!pausedInfo) {
            return false;
        }
        const isStillPaused = new Date(pausedInfo.pausedUntil) > new Date();
        if (!isStillPaused) {
            await this.resumeAI(phoneNumber);
        }
        return isStillPaused;
    }

    async pauseAI(phoneNumber, days) {
        const db = await this.loadDatabase();
        const pausedUntil = new Date();
        pausedUntil.setDate(pausedUntil.getDate() + days);

        const existingIndex = db.pausedNumbers.findIndex(p => p.number === phoneNumber);
        if (existingIndex !== -1) {
            db.pausedNumbers[existingIndex].pausedUntil = pausedUntil.toISOString();
        } else {
            db.pausedNumbers.push({ number: phoneNumber, pausedUntil: pausedUntil.toISOString() });
        }

        return await this.saveDatabase(db);
    }

    async resumeAI(phoneNumber) {
        const db = await this.loadDatabase();
        db.pausedNumbers = db.pausedNumbers.filter(p => p.number !== phoneNumber);
        return await this.saveDatabase(db);
    }

    async getPausedNumbers() {
        const db = await this.loadDatabase();
        return db.pausedNumbers;
    }
}

module.exports = DatabaseService;