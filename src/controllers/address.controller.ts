import { NextFunction, Request, Response } from 'express';
import { addressService } from '../services/address.service';
import { sendCreated, sendSuccess } from '../utils/response';

export class AddressController {
  async getAddresses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const addresses = await addressService.getAddresses(req.user!.userId);
      sendSuccess(res, addresses, 'Addresses retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const address = await addressService.createAddress(req.user!.userId, req.body);
      sendCreated(res, address, 'Address added successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const address = await addressService.updateAddress(
        req.params.id as string,
        req.user!.userId,
        req.body,
      );
      sendSuccess(res, address, 'Address updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async deleteAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      await addressService.deleteAddress(req.params.id as string, req.user!.userId);
      sendSuccess(res, null, 'Address deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  async setDefaultAddress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const address = await addressService.setDefaultAddress(
        req.params.id as string,
        req.user!.userId,
      );
      sendSuccess(res, address, 'Default address set successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const addressController = new AddressController();
