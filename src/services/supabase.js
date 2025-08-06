const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://malqciqrizkwqyrxptal.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1hbHFjaXFyaXprd3F5cnhwdGFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDIxODIsImV4cCI6MjA3MDAxODE4Mn0.7M19h2_SDXvM-KOoLAh4KbT2dkGB6i-VTxpkt3mdtg';
        
        this.supabase = createClient(supabaseUrl, supabaseKey);
    }

    // CRUD para Marcas
    async getAllBrands() {
        try {
            const { data, error } = await this.supabase
                .from('brands')
                .select('*')
                .order('name');
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching brands:', error);
            return { success: false, error: error.message };
        }
    }

    async createBrand(name, description = '') {
        try {
            const { data, error } = await this.supabase
                .from('brands')
                .insert([{ name, description }])
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating brand:', error);
            return { success: false, error: error.message };
        }
    }

    async updateBrand(id, name, description) {
        try {
            const { data, error } = await this.supabase
                .from('brands')
                .update({ name, description })
                .eq('id', id)
                .select()
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating brand:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteBrand(id) {
        try {
            const { error } = await this.supabase
                .from('brands')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting brand:', error);
            return { success: false, error: error.message };
        }
    }

    // CRUD para Produtos
    async getAllProducts() {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    brands:brand_id (
                        id,
                        name,
                        description
                    )
                `)
                .order('name');
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error fetching products:', error);
            return { success: false, error: error.message };
        }
    }

    async createProduct(name, description, price, quantity, brandId) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .insert([{
                    name,
                    description,
                    price: parseFloat(price),
                    quantity: parseInt(quantity) || 0,
                    brand_id: brandId
                }])
                .select(`
                    *,
                    brands:brand_id (
                        id,
                        name,
                        description
                    )
                `)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error creating product:', error);
            return { success: false, error: error.message };
        }
    }

    async updateProduct(id, name, description, price, quantity, brandId) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .update({
                    name,
                    description,
                    price: parseFloat(price),
                    quantity: parseInt(quantity) || 0,
                    brand_id: brandId
                })
                .eq('id', id)
                .select(`
                    *,
                    brands:brand_id (
                        id,
                        name,
                        description
                    )
                `)
                .single();
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error updating product:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteProduct(id) {
        try {
            const { error } = await this.supabase
                .from('products')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error('Error deleting product:', error);
            return { success: false, error: error.message };
        }
    }

    async findProducts(searchTerm) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    brands:brand_id (
                        id,
                        name,
                        description
                    )
                `)
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .order('name');
            
            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Error searching products:', error);
            return { success: false, error: error.message };
        }
    }

    async findProduct(searchTerm) {
        try {
            const { data, error } = await this.supabase
                .from('products')
                .select(`
                    *,
                    brands:brand_id (
                        id,
                        name,
                        description
                    )
                `)
                .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
                .limit(1)
                .single();
            
            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data: error ? null : data };
        } catch (error) {
            console.error('Error finding product:', error);
            return { success: false, error: error.message };
        }
    }

    // Método para compatibilidade com o sistema antigo
    async getItemsFormatted() {
        try {
            const result = await this.getAllProducts();
            if (!result.success || !result.data || result.data.length === 0) {
                return 'Nenhum produto encontrado no banco de dados.';
            }

            let message = 'Produtos disponíveis:\n\n';
            result.data.forEach((product, index) => {
                const brandName = product.brands ? product.brands.name : 'Sem marca';
                message += `${index + 1}. ${product.name} (${brandName}): R$${product.price} - Qtd: ${product.quantity}\n`;
            });

            return message;
        } catch (error) {
            console.error('Error getting formatted items:', error);
            return 'Erro ao buscar produtos.';
        }
    }
}

module.exports = SupabaseService;