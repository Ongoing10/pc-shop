// npm run screenshots: chạy Vite dev server, chụp full-page từng màn hình bằng Playwright (Chromium),
// lưu vào docs/ui/screenshots/{desktop,mobile}/. Chụp một phần: npm run screenshots -- k02 --mobile
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { chromium } from 'playwright';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, '../../docs/ui/screenshots');

const viewports = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

// Mỗi ảnh: tên file theo brief mục 4 (<mã màn>-<tên>[--<trạng thái>]), query chọn trạng thái, viewport.
const shots = [
  { name: 'k02-products--chat-open', query: '', viewport: 'desktop' },
  { name: 'k02-products--chat-open', query: '', viewport: 'mobile' },
  { name: 'k02-products', query: '?chat=closed', viewport: 'mobile' },
];

const args = process.argv.slice(2);
const only = args.filter((a) => !a.startsWith('--'));
const onlyViewport = Object.keys(viewports).find((v) => args.includes(`--${v}`));
const selected = shots.filter(
  (s) => (only.length === 0 || only.some((o) => s.name.startsWith(o))) && (!onlyViewport || s.viewport === onlyViewport),
);

// Tắt mọi animation/transition và con trỏ nhấp nháy để ảnh ổn định giữa các lần chụp.
const freezeCss = `*, *::before, *::after {
  animation: none !important; transition: none !important; caret-color: transparent !important;
}`;

const server = await createServer({ root, logLevel: 'error', server: { port: 5199, strictPort: true } });
await server.listen();
const baseUrl = server.resolvedUrls.local[0];
const browser = await chromium.launch();
let problems = 0;

try {
  for (const shot of selected) {
    const context = await browser.newContext({
      viewport: viewports[shot.viewport],
      deviceScaleFactor: 2,
      reducedMotion: 'reduce',
      locale: 'vi-VN',
    });
    const page = await context.newPage();
    // Font phải đến từ @fontsource (npm); chặn Google Fonts để lỡ có link cũng không dùng được.
    await page.route(/fonts\.(googleapis|gstatic)\.com/, (route) => route.abort());
    await page.goto(new URL(shot.query, baseUrl).href, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: freezeCss });

    const report = await page.evaluate(async () => {
      // Ép tải subset tiếng Việt của từng weight đang dùng rồi mới chờ fonts.ready.
      const sample = 'Tiếng Việt: ắ ằ ẳ ẵ ặ ế ề ể ễ ệ ố ồ ổ ỗ ộ ứ ừ ử ữ ự đ Đ';
      await Promise.all([
        ...[400, 500, 600, 700].map((w) => document.fonts.load(`${w} 16px "Be Vietnam Pro"`, sample)),
        ...[400, 500].map((w) => document.fonts.load(`${w} 12px "JetBrains Mono"`, 'MB-GIGABYTE-B650M-D5')),
      ]);
      await document.fonts.ready;
      const loaded = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family} ${f.weight}`);

      // Kiểm tra bố cục: trang cuộn ngang, hoặc chữ bị cắt/tràn khỏi phần tử chứa nó.
      const issues = [];
      if (document.documentElement.scrollWidth > window.innerWidth) {
        issues.push(`trang rộng ${document.documentElement.scrollWidth}px > viewport ${window.innerWidth}px`);
      }
      for (const el of document.querySelectorAll('body *')) {
        const style = getComputedStyle(el);
        // Bỏ qua phần tử ẩn và nhãn .sr-only (rộng 1px cho trình đọc màn hình, cố ý cắt).
        if (style.display === 'none' || el.closest('svg, .sr-only') || !el.textContent?.trim()) continue;
        const scrollable = /(auto|scroll)/.test(style.overflowX + style.overflowY);
        if (!scrollable && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 1 && el.children.length === 0) {
          issues.push(`chữ tràn ngang: "${el.textContent.trim().slice(0, 50)}" (${el.scrollWidth}px > ${el.clientWidth}px)`);
        }
      }
      return { loaded: [...new Set(loaded)], issues };
    });

    if (!report.loaded.some((f) => f.startsWith('"Be Vietnam Pro"') || f.startsWith('Be Vietnam Pro'))) {
      throw new Error(`Font Be Vietnam Pro chưa tải, dừng chụp ${shot.name}. Đã tải: ${report.loaded.join(', ')}`);
    }

    const file = resolve(outDir, shot.viewport, `${shot.name}.png`);
    await mkdir(dirname(file), { recursive: true });
    await page.screenshot({ path: file, fullPage: true, animations: 'disabled', caret: 'hide' });
    console.log(`✔ ${shot.viewport.padEnd(7)} ${file}`);
    for (const issue of report.issues) {
      problems++;
      console.log(`  ! ${issue}`);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await server.close();
}

if (problems > 0) {
  console.log(`\n${problems} vấn đề bố cục, xem ảnh và sửa trước khi giao.`);
  process.exitCode = 1;
}
