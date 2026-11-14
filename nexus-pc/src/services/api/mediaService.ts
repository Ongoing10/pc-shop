import type * as Api from '../../types/api';
import { BaseService } from './BaseService';

/** media-service: tải file lên (ảnh sản phẩm, avatar, ảnh review) */
class MediaService extends BaseService {
  constructor() {
    super('/media');
  }

  /** POST /media/upload (multipart: file, bucket) → MediaFile; `url` dùng trực tiếp cho <img> */
  upload(file: File, bucket: Api.MediaBucket) {
    const form = new FormData();
    form.append('file', file);
    form.append('bucket', bucket);
    return this.uploadForm<Api.MediaFile>('/upload', form);
  }

  async deleteFile(id: number): Promise<void> {
    await this.remove(`/files/${id}`);
  }
}

export const mediaService = new MediaService();
