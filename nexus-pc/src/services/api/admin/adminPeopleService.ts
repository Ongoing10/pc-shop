import type * as Api from '../../../types/api';
import { AdminUser } from '../../../types/admin';
import { BaseService } from '../BaseService';

/** customer-service (tài khoản Keycloak) và review-service phía quản trị */
class AdminPeopleService extends BaseService {
  constructor() {
    super('/admin');
  }

  // ----- tài khoản -----
  /** Danh sách + vai trò: backend trả role ở API chi tiết nên gọi thêm theo từng người (tối đa 100 người/lần) */
  async listUsers(keyword?: string): Promise<AdminUser[]> {
    const page = await this.get<Api.PageResponse<Api.AdminUserRow>>('/users', { keyword, page: 0, size: 100 });
    const details = await Promise.all(page.content.map((u) => this.get<Api.AdminUserDetail>(`/users/${u.id}`)));
    return details.map((d) => ({
      id: d.id,
      username: d.username,
      email: d.email,
      fullName: [d.firstName, d.lastName].filter(Boolean).join(' ') || d.username,
      active: d.active,
      phoneNumber: d.profile?.phoneNumber ?? null,
      createdTimestamp: d.createdTimestamp,
      realmRoles: d.realmRoles,
      permissions: d.permissions,
    }));
  }
  createStaff(body: Api.CreateStaffRequest) {
    return this.post<Api.UserRoles>('/users', body);
  }
  setRoles(id: string, body: Api.RolesRequest) {
    return this.put<Api.UserRoles>(`/users/${id}/roles`, body);
  }
  lockUser(id: string) {
    return this.put<string>(`/users/${id}/lock`);
  }
  unlockUser(id: string) {
    return this.put<string>(`/users/${id}/unlock`);
  }

  // ----- đánh giá -----
  /** Backend lọc theo MỘT trạng thái mỗi lần (mặc định 1), nên lấy chờ duyệt / đã duyệt / từ chối rồi gộp */
  async listReviews(): Promise<Api.Review[]> {
    const groups = await Promise.all([1, 2, 3].map((status) => this.getAllPages<Api.Review>('/reviews', { status })));
    return groups.flat().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }
  approveReviews(ids: string[]) {
    return this.patch<Api.Review[]>('/reviews/bulk/approve', { ids } satisfies Api.BulkIdsRequest);
  }
  rejectReviews(ids: string[]) {
    return this.patch<Api.Review[]>('/reviews/bulk/reject', { ids } satisfies Api.BulkIdsRequest);
  }
  replyReview(id: string, content: string) {
    return this.post<Api.Review>(`/reviews/${id}/reply`, { content } satisfies Api.ReplyRequest);
  }
}

export const adminPeopleService = new AdminPeopleService();
