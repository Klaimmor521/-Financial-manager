const express = require('express');
const router = express.Router();
const GoalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Create a new goal
router.post('/', GoalController.createGoal);
// Get all goals
router.get('/', GoalController.getGoals);
// Get a single goal
router.get('/:id', GoalController.getGoal);
// Update a goal
router.put('/:id', GoalController.updateGoal);
// Update goal amount (add or subtract from current amount)
router.patch('/:id/amount', GoalController.updateGoalAmount);
// Delete a goal
router.delete('/:id', GoalController.deleteGoal);

module.exports = router;