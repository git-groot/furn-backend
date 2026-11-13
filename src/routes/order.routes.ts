import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createOrderSchema } from '../validators/order.validator';

const router = Router();

router.use(authenticate);

router.post('/', validate(createOrderSchema), orderController.createOrder.bind(orderController));

router.get('/my-orders', orderController.getMyOrders.bind(orderController));
router.get('/:id', orderController.getOrderById.bind(orderController));

export default router;
