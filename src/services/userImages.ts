import axios from 'axios';

const API_BASE = '/api/user-images';

export interface UserImage {
  id: number;
  userId: number;
  imageType: string;
  imageData: string;
  imageName: string;
  imageSize: number;
  sortOrder: number;
  createdAt: string;
}

class UserImagesService {
  private cache: Map<string, UserImage[]> = new Map();
  private maxImages = 6;

  async getImages(imageType?: string, userId?: number): Promise<UserImage[]> {
    try {
      const params: any = {};
      if (imageType) params.imageType = imageType;
      if (userId) params.userId = userId;

      const response = await axios.get(API_BASE, { params });
      const images = response.data.data || [];

      const cacheKey = this.getCacheKey(imageType, userId);
      this.cache.set(cacheKey, images);

      return images;
    } catch (error) {
      console.error('获取用户图片失败:', error);
      return this.getFromLocalStorage(imageType);
    }
  }

  async getImage(id: number, userId?: number): Promise<UserImage | null> {
    try {
      const params: any = {};
      if (userId) params.userId = userId;

      const response = await axios.get(`${API_BASE}/${id}`, { params });
      return response.data.data;
    } catch (error) {
      console.error('获取用户图片失败:', error);
      return null;
    }
  }

  async uploadImage(file: File, imageType: string, userId?: number): Promise<UserImage> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('imageType', imageType);
      if (userId) formData.append('userId', String(userId));

      const response = await axios.post(API_BASE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      const image = response.data.data;

      const cacheKey = this.getCacheKey(imageType, userId);
      const cachedImages = this.cache.get(cacheKey) || [];
      cachedImages.push(image);
      this.cache.set(cacheKey, cachedImages);

      this.saveToLocalStorage(imageType, cachedImages);

      return image;
    } catch (error) {
      console.error('上传用户图片失败:', error);
      throw error;
    }
  }

  async deleteImage(id: number, imageType: string, userId?: number): Promise<boolean> {
    try {
      const params: any = {};
      if (userId) params.userId = userId;

      await axios.delete(`${API_BASE}/${id}`, { params });

      const cacheKey = this.getCacheKey(imageType, userId);
      const cachedImages = this.cache.get(cacheKey) || [];
      const filteredImages = cachedImages.filter(img => img.id !== id);
      this.cache.set(cacheKey, filteredImages);

      this.saveToLocalStorage(imageType, filteredImages);

      return true;
    } catch (error) {
      console.error('删除用户图片失败:', error);
      return false;
    }
  }

  async reorderImages(imageIds: number[], imageType: string, userId?: number): Promise<boolean> {
    try {
      const data: any = { imageIds };
      if (userId) data.userId = userId;

      await axios.put(`${API_BASE}/reorder`, data);

      const cacheKey = this.getCacheKey(imageType, userId);
      const cachedImages = this.cache.get(cacheKey) || [];
      
      const reorderedImages = imageIds
        .map(id => cachedImages.find(img => img.id === id))
        .filter(img => img !== undefined);

      this.cache.set(cacheKey, reorderedImages);

      this.saveToLocalStorage(imageType, reorderedImages);

      return true;
    } catch (error) {
      console.error('重新排序图片失败:', error);
      return false;
    }
  }

  async getImageCount(imageType?: string, userId?: number): Promise<number> {
    try {
      const params: any = {};
      if (imageType) params.imageType = imageType;
      if (userId) params.userId = userId;

      const response = await axios.get(`${API_BASE}/count`, { params });
      return response.data.data.count || 0;
    } catch (error) {
      console.error('获取图片数量失败:', error);
      return this.getFromLocalStorage(imageType).length;
    }
  }

  async deleteAllImages(imageType?: string, userId?: number): Promise<boolean> {
    try {
      const params: any = {};
      if (imageType) params.imageType = imageType;
      if (userId) params.userId = userId;

      await axios.delete(API_BASE, { params });

      const cacheKey = this.getCacheKey(imageType, userId);
      this.cache.delete(cacheKey);

      this.removeFromLocalStorage(imageType || 'all');

      return true;
    } catch (error) {
      console.error('删除所有图片失败:', error);
      return false;
    }
  }

  getMaxImages(): number {
    return this.maxImages;
  }

  private getCacheKey(imageType?: string, userId?: number): string {
    return `${imageType || 'all'}_${userId || 0}`;
  }

  private getFromLocalStorage(imageType?: string): UserImage[] {
    try {
      const saved = localStorage.getItem('userImages');
      if (!saved) return [];

      const allImages = JSON.parse(saved);
      
      if (imageType) {
        return allImages.filter((img: UserImage) => img.imageType === imageType);
      }

      return allImages;
    } catch (error) {
      console.error('从localStorage加载图片失败:', error);
      return [];
    }
  }

  private saveToLocalStorage(imageType: string, images: UserImage[]): void {
    try {
      let allImages: UserImage[] = this.getFromLocalStorage();
      
      allImages = allImages.filter(img => img.imageType !== imageType);
      allImages = allImages.concat(images);

      localStorage.setItem('userImages', JSON.stringify(allImages));
    } catch (error) {
      console.error('保存图片到localStorage失败:', error);
    }
  }

  private removeFromLocalStorage(imageType: string): void {
    try {
      const saved = localStorage.getItem('userImages');
      if (!saved) return;

      const allImages = JSON.parse(saved);
      const filteredImages = allImages.filter((img: UserImage) => img.imageType !== imageType);

      localStorage.setItem('userImages', JSON.stringify(filteredImages));
    } catch (error) {
      console.error('从localStorage删除图片失败:', error);
    }
  }
}

export default new UserImagesService();
