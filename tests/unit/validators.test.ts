import { registerSchema } from '../../src/validators/auth.validator';
import { productQuerySchema } from '../../src/validators/product.validator';

describe('Zod Schema Validators', () => {
  it('should accept valid registration input', async () => {
    const validData = {
      body: {
        email: 'test@example.com',
        password: 'ValidPassword1',
        first_name: 'Alice',
        last_name: 'Smith',
        phone: '+91 9876543210',
      },
    };
    await expect(registerSchema.parseAsync(validData)).resolves.toBeDefined();
  });

  it('should reject weak password in registration', async () => {
    const invalidData = {
      body: {
        email: 'test@example.com',
        password: 'weak',
        first_name: 'Alice',
        last_name: 'Smith',
      },
    };
    await expect(registerSchema.parseAsync(invalidData)).rejects.toThrow();
  });

  it('should validate product query defaults', async () => {
    const query = {
      query: {},
    };
    const parsed = await productQuerySchema.parseAsync(query);
    expect(parsed.query.page).toBe(1);
    expect(parsed.query.limit).toBe(12);
    expect(parsed.query.sort).toBe('newest');
  });
});

