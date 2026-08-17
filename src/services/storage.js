import { Storage, ID } from '../firebase/adapter.js';
import { client } from './client';
import { conf } from './conf/conf';

export class StorageService {
    storage;

    constructor() {
        this.storage = new Storage(client);
    }

    async uploadFile(file, bucketId = conf.firebaseBucketId || 'images') {
        // Automatically compress raw heavy images (e.g. 5MB-10MB 4K PNGs) down to crisp ~120KB WebP before upload
        let fileToUpload = file;
        if (file && file.type && file.type.startsWith('image/')) {
            try {
                fileToUpload = await compressImage(file, 1600, 2000, 0.82);
            } catch (compErr) {
                console.warn("Auto-compression skipped, using original file:", compErr.message);
            }
        }

        // If a Cloudflare Worker URL is configured, try uploading to Backblaze B2.
        // If worker fails, fall back gracefully to standard Firebase Storage.
        if (conf.firebaseCloudflareWorkerUrl) {
            try {
                const formData = new FormData();
                formData.append('file', fileToUpload);

                const response = await fetch(conf.firebaseCloudflareWorkerUrl, {
                    method: 'POST',
                    body: formData,
                });

                if (response.ok) {
                    const result = await response.json();
                    if (result && result.url) {
                        return { $id: result.url };
                    }
                }
                console.warn("Cloudflare Worker upload response not OK or missing url, falling back to Firebase Storage.");
            } catch (error) {
                console.warn("Cloudflare Worker B2 Upload error, falling back to Firebase Storage:", error.message);
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
            console.error("Firebase service :: uploadFile :: error", error.message);
            throw error;
        }
    }

    getFileView(fileId, bucketId = conf.firebaseBucketId || 'images') {
        if (!fileId) return '';
        if (typeof fileId === 'object' && fileId !== null) {
            fileId = fileId.$id || fileId.url || fileId.id || fileId.href || '';
        }
        if (typeof fileId !== 'string') return '';
        fileId = fileId.trim();

        // If the fileId is already a full HTTP/HTTPS URL, sanitize legacy subdomains and return directly.
        if (fileId.startsWith('http://') || fileId.startsWith('https://')) {
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
            console.error("Firebase service :: getFileView :: error", error.message);
            return fileId;
        }
    }
}


export const compressImage = (file, maxWidth = 1600, maxHeight = 2000, quality = 0.82) => {
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
