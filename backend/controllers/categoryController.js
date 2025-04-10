const Category = require('../models/categoryModel');

class CategoryController {
  // static async createCategory(req, res) {
  //   try {
  //     const { name, type, icon } = req.body;
  //     const userId = req.user.id;
      
  //     // Validation
  //     if (!name || !type) {
  //       return res.status(400).json({ message: 'Name and type are required' });
  //     }
      
  //     if (type !== 'income' && type !== 'expense') {
  //       return res.status(400).json({ message: 'Type must be either income or expense' });
  //     }
      
  //     // Create category
  //     const category = await Category.create({
  //       name,
  //       type,
  //       icon: icon || '',
  //       userId
  //     });
      
  //     res.status(201).json({
  //       success: true,
  //       message: 'Category created successfully',
  //       data: category
  //     });
  //   } catch (error) {
  //     console.error('Error creating category:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error creating category',
  //       error: error.message
  //     });
  //   }
  // }
  
  static async getAllCategories(req, res) {
    try {
      const categories = await Category.findAll();
      res.status(200).json(categories);
    } catch (error) {
      console.error('Ошибка получения категорий:', error);
      res.status(500).json({ message: 'Ошибка получения категорий' });
    }
  }
  
  static async getCategoriesByType(req, res) {
    try {
      const { type } = req.params;

      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Неверный тип категории' });
      }

      const categories = await Category.findByType(type);
      res.status(200).json(categories);
    } catch (error) {
      console.error('Ошибка получения категорий по типу:', error);
      res.status(500).json({ message: 'Ошибка получения категорий по типу' });
    }
  }
  
  // static async getCategoryById(req, res) {
  //   try {
  //     const { id } = req.params;
      
  //     const category = await Category.findById(id);
      
  //     if (!category) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Category not found'
  //       });
  //     }
      
  //     res.status(200).json({
  //       success: true,
  //       data: category
  //     });
  //   } catch (error) {
  //     console.error('Error fetching category:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error fetching category',
  //       error: error.message
  //     });
  //   }
  // }
  
  // static async updateCategory(req, res) {
  //   try {
  //     const userId = req.user.id;
  //     const { id } = req.params;
  //     const { name, icon } = req.body;
      
  //     // Check if category exists and belongs to user
  //     const existingCategory = await Category.findById(id);
  //     if (!existingCategory) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Category not found'
  //       });
  //     }
      
  //     if (existingCategory.user_id !== userId) {
  //       return res.status(403).json({
  //         success: false,
  //         message: 'You can only update your own categories'
  //       });
  //     }
      
  //     // Update category
  //     const category = await Category.update(id, {
  //       name: name || existingCategory.name,
  //       icon: icon !== undefined ? icon : existingCategory.icon
  //     }, userId);
      
  //     res.status(200).json({
  //       success: true,
  //       message: 'Category updated successfully',
  //       data: category
  //     });
  //   } catch (error) {
  //     console.error('Error updating category:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error updating category',
  //       error: error.message
  //     });
  //   }
  // }
  
  // static async deleteCategory(req, res) {
  //   try {
  //     const userId = req.user.id;
  //     const { id } = req.params;
      
  //     // Check if category exists and belongs to user
  //     const existingCategory = await Category.findById(id);
  //     if (!existingCategory) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'Category not found'
  //       });
  //     }
      
  //     if (existingCategory.user_id !== userId) {
  //       return res.status(403).json({
  //         success: false,
  //         message: 'You can only delete your own categories'
  //       });
  //     }
      
  //     // Delete category
  //     await Category.delete(id, userId);
      
  //     res.status(200).json({
  //       success: true,
  //       message: 'Category deleted successfully'
  //     });
  //   } catch (error) {
  //     console.error('Error deleting category:', error);
  //     res.status(500).json({
  //       success: false,
  //       message: 'Error deleting category',
  //       error: error.message
  //     });
  //   }
  // }
  
  static async getCategorySummary(req, res) {
    try {
      const userId = req.user.id;
      const { type } = req.params;
      const { startDate, endDate } = req.query;

      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ message: 'Неверный тип категории' });
      }

      const summary = await Category.getCategorySummary(userId, type, { startDate, endDate });
      res.status(200).json(summary);
    } catch (error) {
      console.error('Ошибка получения сводки категорий:', error);
      res.status(500).json({ message: 'Ошибка получения сводки категорий' });
    }
  }
}

module.exports = CategoryController;