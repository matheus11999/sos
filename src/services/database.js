const fs = require('fs-extra');
const path = require('path');

class DatabaseService {
    constructor() {
        this.dbPath = path.join(__dirname, '../../database.json');
    }

    async loadDatabase() {
        try {
            const data = await fs.readJson(this.dbPath);
            return data;
        } catch (error) {
            console.error('Error loading database:', error);
            return [];
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
        const items = await this.loadDatabase();
        const normalizedSearch = searchTerm.toLowerCase();
        
        return items.find(item => 
            item.item.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(item.item.toLowerCase())
        );
    }

    async findItems(searchTerm) {
        const items = await this.loadDatabase();
        const normalizedSearch = searchTerm.toLowerCase();
        
        return items.filter(item => 
            item.item.toLowerCase().includes(normalizedSearch) ||
            normalizedSearch.includes(item.item.toLowerCase())
        );
    }

    async addItem(itemName, price) {
        const items = await this.loadDatabase();
        
        const existingItem = items.find(item => 
            item.item.toLowerCase() === itemName.toLowerCase()
        );
        
        if (existingItem) {
            return { success: false, message: 'Item já existe no banco de dados' };
        }

        const newItem = {
            item: itemName,
            price: parseFloat(price)
        };

        items.push(newItem);
        const saved = await this.saveDatabase(items);
        
        if (saved) {
            return { 
                success: true, 
                message: `Item '${itemName}' adicionado com sucesso por R$${price}!`,
                item: newItem
            };
        } else {
            return { success: false, message: 'Erro ao salvar item no banco de dados' };
        }
    }

    async updateItem(itemName, newPrice) {
        const items = await this.loadDatabase();
        const itemIndex = items.findIndex(item => 
            item.item.toLowerCase() === itemName.toLowerCase()
        );
        
        if (itemIndex === -1) {
            return { success: false, message: 'Item não encontrado no banco de dados' };
        }

        const oldPrice = items[itemIndex].price;
        items[itemIndex].price = parseFloat(newPrice);
        
        const saved = await this.saveDatabase(items);
        
        if (saved) {
            return { 
                success: true, 
                message: `Preço do item '${itemName}' alterado de R$${oldPrice} para R$${newPrice}!`,
                item: items[itemIndex]
            };
        } else {
            return { success: false, message: 'Erro ao atualizar item no banco de dados' };
        }
    }

    async removeItem(itemName) {
        const items = await this.loadDatabase();
        const itemIndex = items.findIndex(item => 
            item.item.toLowerCase() === itemName.toLowerCase()
        );
        
        if (itemIndex === -1) {
            return { success: false, message: 'Item não encontrado no banco de dados' };
        }

        const removedItem = items[itemIndex];
        items.splice(itemIndex, 1);
        
        const saved = await this.saveDatabase(items);
        
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
        const items = await this.loadDatabase();
        return items;
    }

    async getItemsFormatted() {
        const items = await this.loadDatabase();
        if (items.length === 0) {
            return 'Nenhum item encontrado no banco de dados.';
        }

        let message = 'Itens disponíveis:\n\n';
        items.forEach((item, index) => {
            message += `${index + 1}. ${item.item}: R$${item.price}\n`;
        });

        return message;
    }
}

module.exports = DatabaseService;