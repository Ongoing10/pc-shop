import { message } from 'antd';

export const buildShareUrl = (code: string) => `${window.location.origin}/build/${code}`;

/** Chép link vào clipboard; trình duyệt chặn clipboard thì hiện link để chép tay */
export async function copyToClipboard(text: string, successText: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success(successText);
  } catch {
    message.info(text, 6);
  }
}
