/** Lưu blob tải từ API (xuất Excel, mẫu import) thành file; `file.fileName` là tên backend gửi trong Content-Disposition */
export const saveDownloadedFile = (file: { blob: Blob; fileName: string | null }, fallbackName: string) => {
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.fileName ?? fallbackName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
