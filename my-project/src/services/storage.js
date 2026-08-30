import { Storage, ID } from '../firebase/adapter.js';
import { client } from './client';
import { conf } from './conf/conf';

export const MAX_UPLOAD_SIZE_MB = 10;
export const ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/avif',
    'image/gif',
    'image/svg+xml'
];

/**
 * Validates an image file before upload.
 * @param {File} file - File object to validate
 * @param {number} maxMb - Maximum allowed file size in MB (default 10)
 * @returns {{ valid: boolean, error?: string }}
 */
export const validateImageFile = (file, maxMb = MAX_UPLOAD_SIZE_MB) => {
    if (!file) {
        return { valid: false, error: "No file selected." };
    }

    // Check MIME type or file extension
    const mimeType = (file.type || '').toLowerCase();
    const fileName = (file.name || '').toLowerCase();
    const isAllowedMime = ALLOWED_IMAGE_TYPES.some(t => mimeType === t || mimeType.startsWith('image/'));
    const isAllowedExt = /\.(jpe?g|png|webp|avif|gif|svg)$/i.test(fileName);

    if (!isAllowedMime && !isAllowedExt) {
        return { 
            valid: false, 
            error: "Please upload a valid image file (JPG, PNG, WebP, AVIF, GIF, SVG)." 
        };
    }

    const maxSizeBytes = maxMb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
        const actualMb = (file.size / (1024 * 1024)).toFixed(1);
        return { 
            valid: false, 
            error: `File size (${actualMb}MB) exceeds the maximum limit of ${maxMb}MB.` 
        };
    }

    return { valid: true };
};

export class StorageService {
    storage;

    constructor() {
        this.storage = new Storage(client);
    }

    async uploadFile(file, bucketId = conf.firebaseBucketId || 'products') {
        const validation = validateImageFile(file, MAX_UPLOAD_SIZE_MB);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Automatically compress heavy raster images (e.g. 5MB-10MB 4K PNGs) down to crisp WebP before upload
        let fileToUpload = file;
        if (file && file.type && file.type.startsWith('image/')) {
            try {
                fileToUpload = await compressImage(file, 1600, 2000, 0.85);
            } catch (compErr) {
                console.warn("Auto-compression skipped, using original file:", compErr.message);
            }
        }

        try {
            const response = await this.storage.createFile(
                bucketId,
                ID.unique(),
                fileToUpload
            );
            return response;
        } catch (error) {
            console.error("Firebase Storage service :: uploadFile :: error", error.message);
            throw error;
        }
    }

    getFileView(fileId, bucketId = conf.firebaseBucketId || 'products') {
        if (!fileId) return '';
        if (typeof fileId === 'object' && fileId !== null) {
            fileId = fileId.$id || fileId.url || fileId.id || fileId.href || '';
        }
        if (typeof fileId !== 'string') return '';
        fileId = fileId.trim();

        // If fileId is already a full HTTP/HTTPS URL or DataURL, return directly with domain fixes
        if (fileId.startsWith('http://') || fileId.startsWith('https://') || fileId.startsWith('data:image/')) {
            if (fileId.includes('chandumakavana61.workers.dev')) {
                return fileId.replace(/b2-upload-gateway\.chandumakavana61\.workers\.dev/g, 'b2-upload-gateway.vakrayan.workers.dev')
                             .replace(/vakrayan-data\.chandumakavana61\.workers\.dev/g, 'b2-upload-gateway.vakrayan.workers.dev')
                             .replace(/chandumakavana61\.workers\.dev/g, 'vakrayan.workers.dev');
            }
            return fileId;
        }

        try {
            const result = this.storage.getFileView(fileId, bucketId);
            return typeof result === 'string' ? result : result.toString();
        } catch (error) {
            console.error("Firebase Storage service :: getFileView :: error", error.message);
            return fileId;
        }
    }

    async deleteFile(fileIdOrUrl, bucketId = conf.firebaseBucketId || 'products') {
        try {
            return await this.storage.deleteFile(bucketId, fileIdOrUrl);
        } catch (error) {
            console.warn("Firebase Storage service :: deleteFile warning:", error.message);
            return true;
        }
    }
}

export const compressImage = (file, maxWidth = 1600, maxHeight = 2000, quality = 0.85) => {
  return new Promise((resolve) => {
    if (!file || !(file instanceof Blob) || !file.type || !file.type.startsWith('image/')) {
      return resolve(file);
    }

    // Do not compress SVG vectors or GIF animations
    if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
      return resolve(file);
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        const targetFormat = 'image/webp';
        const cleanName = (file.name || 'image').replace(/\.[^/.]+$/, "") + '.webp';

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], cleanName, {
                type: targetFormat,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Fallback to JPEG
              canvas.toBlob((jpgBlob) => {
                if (jpgBlob) {
                  const jpgName = (file.name || 'image').replace(/\.[^/.]+$/, "") + '.jpg';
                  resolve(new File([jpgBlob], jpgName, { type: 'image/jpeg', lastModified: Date.now() }));
                } else {
                  resolve(file);
                }
              }, 'image/jpeg', quality);
            }
          },
          targetFormat,
          quality
        );
      };
      img.onerror = () => {
        resolve(file);
      };
    };
    reader.onerror = () => {
      resolve(file);
    };
  });
};

const storageService = new StorageService();
export default storageService;
