import { Storage, ID } from 'appwrite';
import { client } from './client';
import { conf } from './conf/conf';

export class StorageService {
    storage;

    constructor() {
        this.storage = new Storage(client);
    }

    async uploadFile(file, bucketId = conf.appwriteBucketId || 'images') {
        // If a Cloudflare Worker URL is configured, use it to upload to Backblaze B2.
        // Otherwise, fall back to standard Appwrite Storage.
        if (conf.appwriteCloudflareWorkerUrl) {
            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch(conf.appwriteCloudflareWorkerUrl, {
                    method: 'POST',
                    body: formData,
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`Worker upload failed: ${response.status} - ${errorText}`);
                }

                const result = await response.json();
                if (result && result.success && result.url) {
                    // Return the URL as $id so that direct references in components load it instantly.
                    return { $id: result.url };
                } else {
                    throw new Error(result?.error || 'Invalid response from upload gateway');
                }
            } catch (error) {
                console.error("Cloudflare Worker B2 Upload :: error", error.message);
                throw error;
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
            console.error("Appwrite service :: uploadFile :: error", error.message);
            throw error;
        }
    }

    getFileView(fileId, bucketId = conf.appwriteBucketId || 'images') {
        // If the fileId is a full URL (e.g. from Backblaze B2), return it directly.
        if (fileId && (fileId.startsWith('http://') || fileId.startsWith('https://'))) {
            return fileId;
        }

        try {
            // getFileView returns a URL string (or object that can be converted to string)
            const result = this.storage.getFileView(bucketId, fileId);
            return typeof result === 'string' ? result : result.toString();
        } catch (error) {
            console.error("Appwrite service :: getFileView :: error", error.message);
            return `${conf.appwriteurl}/storage/buckets/${bucketId}/files/${fileId}/view?project=${conf.appwriteProjectId}`;
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
