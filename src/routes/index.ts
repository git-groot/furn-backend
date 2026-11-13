import { Router } from 'express';
import addressRoutes from './address.routes';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';
import cartRoutes from './cart.routes';
import categoryRoutes from './category.routes';
import orderRoutes from './order.routes';
import productRoutes from './product.routes';
import reviewRoutes from './review.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/cart', cartRoutes);
router.use('/orders', orderRoutes);
router.use('/addresses', addressRoutes);
router.use('/', reviewRoutes);
router.use('/admin', adminRoutes);

export default router;

