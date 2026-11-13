import { Router } from 'express';
import { productController } from '../controllers/product.controller';
import { validate } from '../middlewares/validation.middleware';
import { productQuerySchema, productSlugSchema } from '../validators/product.validator';

const router = Router();

router.get(
  '/',
  validate(productQuerySchema),
  productController.getProducts.bind(productController),
);

router.get(
  '/:slug',
  validate(productSlugSchema),
  productController.getProductBySlug.bind(productController),
);

router.get(
  '/:slug/related',
  validate(productSlugSchema),
  productController.getRelatedProducts.bind(productController),
);

export default router;

