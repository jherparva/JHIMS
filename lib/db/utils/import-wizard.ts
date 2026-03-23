import * as XLSX from 'xlsx';
import Product from '../models/Product';
import Category from '../models/Category';
import mongoose from 'mongoose';

/**
 * Palabras clave para auto-categorización inteligente
 */
const CATEGORY_KEYWORDS: Record<string, string[]> = {
    'Granos y Abarrotes': ['arroz', 'frijol', 'lenteja', 'maiz', 'aceite', 'sal', 'azucar', 'panela'],
    'Ferretería': ['clavo', 'martillo', 'tubo', 'pvc', 'cemento', 'pintura', 'tornillo', 'herramienta'],
    'Lácteos y Huevos': ['leche', 'queso', 'huevo', 'yogurt', 'mantequilla'],
    'Carnes y Embutidos': ['carne', 'pollo', 'cerdo', 'chorizo', 'salchicha', 'jamon'],
    'Aseo y Limpieza': ['jabon', 'detergente', 'limpiador', 'cloro', 'escoba', 'trapero'],
    'Bebidas': ['gaseosa', 'jugo', 'agua', 'cerveza', 'licor', 'soda'],
    'Snacks y Dulces': ['papa', 'galleta', 'chocolate', 'caramelo', 'snack']
};

/**
 * Genera un SKU automático basado en el nombre del producto
 */
function generateAutoSku(name: string): string {
    const initials = name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 3);
    
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${initials}-${random}`;
}

/**
 * Detecta la categoría basada en el nombre del producto
 */
function detectCategory(name: string): string {
    const lowerName = name.toLowerCase();
    
    for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
        if (keywords.some(keyword => lowerName.includes(keyword))) {
            return category;
        }
    }
    
    return 'Varios / Otros';
}

/**
 * Procesa el inventario desde un buffer de Excel
 */
export async function processInventoryImport(companyId: string, buffer: Buffer) {
    if (!companyId) throw new Error("Company ID is required for import");
    
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const range = XLSX.utils.decode_range(workbook.Sheets[sheetName]['!ref'] || 'A1');
    
    // Convertir a JSON
    const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    
    if (data.length === 0) return { success: false, message: 'El archivo está vacío' };

    // 1. LIMPIEZA: Eliminar productos existentes de la empresa (Para empezar de cero)
    await Product.deleteMany({ companyId: new mongoose.Types.ObjectId(companyId) });
    
    const results = {
        created: 0,
        categories: new Set<string>(),
        errors: [] as string[]
    };

    // Cache de categorías para no buscarlas en cada iteración
    const categoryCache = new Map<string, string>();

    for (const row of data) {
        try {
            const name = row.Nombre || row.name || row.Producto;
            if (!name) continue;

            // Inteligencia: SKU
            let sku = row.SKU || row.sku || row.Codigo;
            if (!sku) {
                sku = generateAutoSku(name);
            }

            // Inteligencia: Categoría
            let categoryName = row.Categoria || row.category || row.Grupo;
            if (!categoryName) {
                categoryName = detectCategory(name);
            }

            // Resolver ID de Categoría
            let categoryId = categoryCache.get(categoryName);
            if (!categoryId) {
                let categoryDoc = await Category.findOne({ 
                    companyId: new mongoose.Types.ObjectId(companyId), 
                    name: categoryName 
                });

                if (!categoryDoc) {
                    categoryDoc = await Category.create({
                        companyId: new mongoose.Types.ObjectId(companyId),
                        name: categoryName,
                        isActive: true
                    });
                }
                categoryId = (categoryDoc as any)._id.toString();
                if (!categoryId) throw new Error(`Falló la creación/obtención de la categoría ${categoryName}`);
                categoryCache.set(categoryName, categoryId);
            }

            if (!categoryId) continue;

            // Crear Producto
            await Product.create({
                companyId: new mongoose.Types.ObjectId(companyId),
                sku: sku.toString().toUpperCase(),
                name: name.toString(),
                description: row.Descripcion || row.description || '',
                category: new mongoose.Types.ObjectId(categoryId),
                purchasePrice: parseFloat(row.PrecioCompra || row.purchasePrice || 0),
                salePrice: parseFloat(row.PrecioVenta || row.salePrice || row.Precio || 0),
                stock: parseInt(row.Stock || row.Quantity || row.Cantidad || 0),
                minStock: parseInt(row.StockMinimo || row.minStock || 5),
                isActive: true
            });

            results.created++;
            results.categories.add(categoryName);

        } catch (error: any) {
            console.error('Error procesando fila:', error);
            results.errors.push(`Error en producto "${row.Nombre}": ${error.message}`);
        }
    }

    return {
        success: true,
        message: `Se importaron ${results.created} productos correctamente.`,
        details: {
            productsCreated: results.created,
            categoriesManaged: results.categories.size,
            errors: results.errors
        }
    };
}
