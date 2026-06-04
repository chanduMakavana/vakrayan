import { Client, Storage, ID } from 'appwrite';
import { conf } from './conf/conf';

export class StorageService {
    client = new Client();
    storage;

    constructor() {
        this.client
            .setEndpoint(conf.appwriteurl)
            .setProject(conf.appwriteProjectId)
        .setKey(conf.appwriteApiKey);
        this.storage = new Storage(this.client);
    }

    async uploadFile(file, bucketId = conf.appwriteBucketId || 'images') {
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
