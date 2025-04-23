const express = require('express');
const router = express.Router();
const GoalController = require('../controllers/goalController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/', GoalController.createGoal);
router.get('/', GoalController.getGoals);
router.get('/:id', GoalController.getGoal);
router.put('/:id', GoalController.updateGoal);
router.patch('/:id/amount', GoalController.updateGoalAmount);
router.delete('/:id', GoalController.deleteGoal);

module.exports = router;