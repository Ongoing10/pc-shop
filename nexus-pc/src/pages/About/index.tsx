import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BsArrowRight } from 'react-icons/bs';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { CategoryIcon } from '../../components/common/CategoryIcon';
import { useCategories } from '../../hooks/useCategories';
import { POLICIES } from '../../content/policies';
import hardwareImage from '../../assets/images/category_hardware_1793798677156.jpg';

const STEPS = [
  {
    title: 'Chọn linh kiện hoặc dựng cấu hình',
    text: 'Lọc theo danh mục, giá, thương hiệu; hoặc đi qua 8 vị trí trên PC Builder để thấy tổng tiền ngay.',
  },
  {
    title: 'Nhân viên gọi xác nhận đơn',
    text: 'Trong giờ làm việc, chúng tôi gọi lại để xác nhận địa chỉ và rà socket, loại RAM, công suất nguồn của cấu hình.',
  },
  {
    title: 'Kiểm tra, đóng gói, giao hàng',
    text: 'Linh kiện giữ nguyên seal hãng, bọc chống sốc, giao miễn phí toàn quốc. Bộ PC lắp sẵn được chạy thử trước khi gửi.',
  },
  {
    title: 'Bảo hành và hỗ trợ sau mua',
    text: 'Bảo hành chính hãng theo thời hạn của từng sản phẩm, hỗ trợ cài đặt và kiểm tra lỗi qua hotline.',
  },
];

export const AboutPage: React.FC = () => {
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    document.title = 'Về NEXUS PC · Linh kiện máy tính chính hãng';
  }, []);

  return (
    <main className="container page">
      <Breadcrumb items={['Về NEXUS PC']} />

      <section className="about-intro">
        <div>
          <h1>Linh kiện chính hãng, cấu hình đúng nhu cầu.</h1>
          <p>
            NEXUS PC là cửa hàng linh kiện máy tính tại Hà Nội. Chúng tôi bán CPU, card đồ họa, mainboard, RAM,
            SSD, nguồn, vỏ case và tản nhiệt chính hãng, và tư vấn cấu hình theo đúng việc bạn cần làm với số
            tiền bạn có, không theo cấu hình đắt nhất.
          </p>
          <div className="about-ctas">
            <Link to="/builder" className="btn btn-primary">
              Mở PC Builder <BsArrowRight />
            </Link>
            <Link to="/products" className="btn btn-ghost">
              Xem linh kiện
            </Link>
          </div>
        </div>
        <img src={hardwareImage} alt="Linh kiện máy tính bày trên bàn kỹ thuật" />
      </section>

      <section className="about-section">
        <h2>Mua hàng ở NEXUS PC diễn ra thế nào</h2>
        <ol className="about-steps">
          {STEPS.map((step) => (
            <li key={step.title}>
              <b>{step.title}</b>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="about-section">
        <h2>Chúng tôi bán gì</h2>
        <div className="about-cats">
          {categories.map((c) => (
            <Link key={c.id} to={`/products?category=${c.id}`}>
              <CategoryIcon id={c.id} />
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="about-section">
        <h2>Cam kết của chúng tôi</h2>
        <ul className="about-policies">
          {POLICIES.map((p) => (
            <li key={p.slug}>
              <Link to={`/policy/${p.slug}`}>
                <span>
                  <b>{p.title}</b>
                  <small>{p.summary}</small>
                </span>
                <BsArrowRight aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="about-section">
        <h2>Liên hệ</h2>
        <dl className="about-contact">
          <div>
            <dt>Cửa hàng</dt>
            <dd>Tầng 5, Tòa nhà Công Nghệ NEXUS, Hà Nội</dd>
          </div>
          <div>
            <dt>Hotline</dt>
            <dd>
              <a href="tel:19006868">1900 6868</a>
            </dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>
              <a href="mailto:support@nexuspc.vn">support@nexuspc.vn</a>
            </dd>
          </div>
          <div>
            <dt>Giờ làm việc</dt>
            <dd>8:00–21:30, thứ Hai đến thứ Bảy</dd>
          </div>
        </dl>
      </section>
    </main>
  );
};
