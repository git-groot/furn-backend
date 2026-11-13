import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { optionalAuthenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import {
  addToCartSchema,
  cartItemParamSchema,
  updateCartItemSchema,
} from '../validators/cart.validator';

const router = Router();

router.use(optionalAuthenticate);

router.get('/', cartController.getCart.bind(cartController));

router.post('/items', validate(addToCartSchema), cartController.addItem.bind(cartController));

router.patch(
  '/items/:id',
  validate(updateCartItemSchema),
  cartController.updateQuantity.bind(cartController),
);

router.delete(
  '/items/:id',
  validate(cartItemParamSchema),
  cartController.removeItem.bind(cartController),
);

router.delete('/', cartController.clearCart.bind(cartController));

export default router;
