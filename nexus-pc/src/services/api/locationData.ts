import { Province, Ward } from '../../types/user';

// Dữ liệu tạm cho giao diện. Bản thật: GET /locations/provinces và GET /locations/provinces/{code}/wards (customer-service).
export const mockProvinces: Province[] = [
  { code: '01', name: 'Thành phố Hà Nội' },
  { code: '79', name: 'Thành phố Hồ Chí Minh' },
  { code: '48', name: 'Thành phố Đà Nẵng' },
  { code: '31', name: 'Thành phố Hải Phòng' },
  { code: '92', name: 'Thành phố Cần Thơ' },
];

export const mockWards: Record<string, Ward[]> = {
  '01': [
    { code: '00004', name: 'Phường Ba Đình' },
    { code: '00070', name: 'Phường Hoàn Kiếm' },
    { code: '00160', name: 'Phường Cầu Giấy' },
    { code: '00190', name: 'Phường Đống Đa' },
    { code: '00250', name: 'Phường Hai Bà Trưng' },
    { code: '00310', name: 'Phường Thanh Xuân' },
  ],
  '79': [
    { code: '26734', name: 'Phường Sài Gòn' },
    { code: '26740', name: 'Phường Bến Thành' },
    { code: '26800', name: 'Phường Tân Định' },
    { code: '27100', name: 'Phường Bình Thạnh' },
    { code: '27200', name: 'Phường Thủ Đức' },
  ],
  '48': [
    { code: '20194', name: 'Phường Hải Châu' },
    { code: '20200', name: 'Phường Thanh Khê' },
    { code: '20250', name: 'Phường Sơn Trà' },
  ],
  '31': [
    { code: '11311', name: 'Phường Hồng Bàng' },
    { code: '11320', name: 'Phường Lê Chân' },
    { code: '11350', name: 'Phường Ngô Quyền' },
  ],
  '92': [
    { code: '31117', name: 'Phường Ninh Kiều' },
    { code: '31120', name: 'Phường Cái Khế' },
    { code: '31150', name: 'Phường Bình Thủy' },
  ],
};
