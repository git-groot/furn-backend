import {
  AppError,
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../src/utils/errors';

describe('Custom Error Classes', () => {
  it('should instantiate AppError with appropriate status code', () => {
    const error = new AppError('Custom Error', 418);
    expect(error.message).toBe('Custom Error');
    expect(error.statusCode).toBe(418);
    expect(error.isOperational).toBe(true);
  });

  it('should create NotFoundError with 404', () => {
    const error = new NotFoundError('Item missing');
    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Item missing');
  });

  it('should create BadRequestError with 400', () => {
    const error = new BadRequestError('Bad input');
    expect(error.statusCode).toBe(400);
  });

  it('should create UnauthorizedError with 401', () => {
    const error = new UnauthorizedError();
    expect(error.statusCode).toBe(401);
  });

  it('should create ForbiddenError with 403', () => {
    const error = new ForbiddenError();
    expect(error.statusCode).toBe(403);
  });

  it('should create ValidationError with 422', () => {
    const error = new ValidationError('Invalid fields', [{ field: 'email' }]);
    expect(error.statusCode).toBe(422);
    expect(error.errors).toEqual([{ field: 'email' }]);
  });
});

