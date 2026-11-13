/**
 * Pluggable Image/File Storage Interface.
 * Allows switching between Cloudinary, AWS S3, or local storage without altering business logic.
 */
export interface IStorageService {
  uploadFile(file: { buffer?: Buffer; filename: string; mimetype: string }): Promise<string>;
  deleteFile(fileUrl: string): Promise<boolean>;
}

export class MockStorageService implements IStorageService {
  async uploadFile(file: { buffer?: Buffer; filename: string; mimetype: string }): Promise<string> {
    // TODO: In production, upload buffer to Cloudinary or AWS S3 bucket and return CDN URL.
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    return `https://images.myfurniture.com/uploads/${uniqueSuffix}-${file.filename}`;
  }

  async deleteFile(_fileUrl: string): Promise<boolean> {
    // TODO: In production, delete asset from Cloudinary or AWS S3.
    return true;
  }
}

export const storageService: IStorageService = new MockStorageService();

