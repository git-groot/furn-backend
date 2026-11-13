import { Router } from 'express';
import { addressController } from '../controllers/address.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { addressSchema, updateAddressSchema } from '../validators/address.validator';

const router = Router();

router.use(authenticate);

router.get('/', addressController.getAddresses.bind(addressController));

router.post('/', validate(addressSchema), addressController.createAddress.bind(addressController));

router.put(
  '/:id',
  validate(updateAddressSchema),
  addressController.updateAddress.bind(addressController),
);

router.delete('/:id', addressController.deleteAddress.bind(addressController));

router.patch('/:id/default', addressController.setDefaultAddress.bind(addressController));

export default router;
