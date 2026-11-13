import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';

const router = Router();

router.get('/', categoryController.getAll.bind(categoryController));
router.get('/:slug', categoryController.getBySlug.bind(categoryController));

export default router;

