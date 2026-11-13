import { addressRepository } from '../repositories/address.repository';
import { Address } from '../types';
import { NotFoundError } from '../utils/errors';

export class AddressService {
  async getAddresses(userId: string): Promise<Address[]> {
    return addressRepository.findByUserId(userId);
  }

  async createAddress(userId: string, data: Partial<Address>): Promise<Address> {
    return addressRepository.create(userId, data);
  }

  async updateAddress(id: string, userId: string, data: Partial<Address>): Promise<Address> {
    const updated = await addressRepository.update(id, userId, data);
    if (!updated) {
      throw new NotFoundError('Address not found');
    }
    return updated;
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    const deleted = await addressRepository.delete(id, userId);
    if (!deleted) {
      throw new NotFoundError('Address not found');
    }
  }

  async setDefaultAddress(id: string, userId: string): Promise<Address> {
    const address = await addressRepository.setDefault(id, userId);
    if (!address) {
      throw new NotFoundError('Address not found');
    }
    return address;
  }
}

export const addressService = new AddressService();

