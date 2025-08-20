// Dashboard routes - BFF endpoints
import { Router } from 'express';
import { dashboardController } from '../controllers/dashboardController';

const router = Router();

// Main dashboard data
router.get('/', dashboardController.getDashboard.bind(dashboardController));

// Product overview
router.get('/products/:id/overview', dashboardController.getProductOverview.bind(dashboardController));

// Quick stats
router.get('/stats/summary', dashboardController.getStatsSummary.bind(dashboardController));

export default router;