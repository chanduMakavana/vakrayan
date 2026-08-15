import { Storage, ID } from '../firebase/adapter.js';
import { client } from './client';
import { conf } from './conf/conf';

export class StorageService {
    storage;

    constructor() {
        this.storage = new Storage(client);
    }

    async uploadFile(file, bucketId = conf.firebaseBucketId || 'images') {
        // If a Cloudflare Worker URL is configured, try uploading to Backblaze B2.
        // If worker fails, fall back gracefully to standard Firebase Storage.
        if (conf.firebaseCloudflareWorkerUrl) {
            try {
                const formData = new FormData();
                formData.append('file', file);

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
                file
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


export const compressImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.7) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => {
        resolve(file); // fallback to original file if loading image fails
      };
    };
    reader.onerror = () => {
      resolve(file); // fallback to original file if reader fails
    };
  });
};

const storageService = new StorageService();
export default storageService;
