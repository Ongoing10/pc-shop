import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import {
  AppstoreOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  HeartOutlined,
  HeartFilled,
  MenuOutlined,
  ThunderboltFilled,
  ArrowRightOutlined,
  FireFilled,
  TruckOutlined,
  SafetyCertificateOutlined,
  CustomerServiceOutlined,
  RightOutlined,
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  CheckCircleFilled,
  FilterOutlined,
  SwapOutlined,
  DesktopOutlined,
  DownOutlined,
  StarFilled,
  CreditCardOutlined,
  EnvironmentOutlined,
  LogoutOutlined,
  InboxOutlined,
  SettingOutlined,
  CheckOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  Badge,
  Button,
  Drawer,
  Input,
  InputNumber,
  Select,
  Slider,
  Tag,
  Checkbox,
  Empty,
  Divider,
  Radio,
  Steps,
  message,
} from "antd";
import { categories, products, money, catName } from "./data";

function Reveal({ children, delay = 0, dir = "up" }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.IntersectionObserver) {
      el.classList.add("shown");
      return;
    }
    const ob = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          el.classList.add("shown");
          ob.unobserve(el);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -35px" }
    );
    ob.observe(el);
    return () => ob.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={`reveal ${dir}`}
      style={{ "--delay": delay + "ms" }}
    >
      {children}
    </div>
  );
}
function Logo() {
  return (
    <Link to="/" className="logo">
      <i>
        <ThunderboltFilled />
      </i>
      <span>
        <b>
          NEXUS<span>PC</span>
        </b>
        <small>BUILD YOUR NEXT LEVEL</small>
      </span>
    </Link>
  );
}
function Header({ count, onCart }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const links = (
    <>
      <NavLink to="/products">Sản phẩm</NavLink>
      <NavLink to="/products?category=gpu">Linh kiện</NavLink>
      <NavLink to="/builder">PC Builder</NavLink>
      <a href="/#deals">Khuyến mãi</a>
    </>
  );
  return (
    <>
      <div className="topline">
        <div className="container">
          Hệ thống linh kiện PC chính hãng{" "}
          <span>
            <TruckOutlined /> Giao hàng toàn quốc　·　Hỗ trợ kỹ thuật 24/7
          </span>
        </div>
      </div>
      <header className="header">
        <div className="container head">
          <button className="mobile icon" onClick={() => setOpen(true)}>
            <MenuOutlined />
          </button>
          <Logo />
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault();
              nav("/products?search=" + encodeURIComponent(q));
            }}
          >
            <SearchOutlined />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm linh kiện, thương hiệu, mã sản phẩm..."
            />
            <kbd>ENTER</kbd>
            <button>
              <SearchOutlined />
            </button>
          </form>
          <div className="head-actions">
            <Link to="/account">
              <UserOutlined />
              <span>
                Tài khoản<small>Đăng nhập</small>
              </span>
            </Link>
            <button onClick={onCart}>
              <Badge count={count}>
                <ShoppingCartOutlined />
              </Badge>
              <span>Giỏ hàng</span>
            </button>
          </div>
        </div>
        <nav className="container nav">
          <Link className="navcat" to="/products">
            <AppstoreOutlined /> DANH MỤC SẢN PHẨM <DownOutlined />
          </Link>
          <div>{links}</div>
          <Link className="hot" to="/products?sort=discount">
            <FireFilled /> FLASH SALE <b>HOT</b>
          </Link>
        </nav>
      </header>
      <Drawer
        title={<Logo />}
        open={open}
        onClose={() => setOpen(false)}
        placement="left"
      >
        <div className="mobile-links" onClick={() => setOpen(false)}>
          {links}
          <Link to="/compare">So sánh</Link>
          <Link to="/account">Tài khoản</Link>
        </div>
      </Drawer>
    </>
  );
}
function Footer() {
  return (
    <footer className="footer">
      <div className="container footgrid">
        <div>
          <Logo />
          <p>
            Nơi bắt đầu cho bộ PC tiếp theo của bạn. Linh kiện chính hãng, tư
            vấn đúng nhu cầu, đồng hành trong từng trải nghiệm.
          </p>
        </div>
        <div>
          <b>Về NEXUS PC</b>
          <a>Giới thiệu</a>
          <a>Liên hệ</a>
          <a>Tin công nghệ</a>
        </div>
        <div>
          <b>Hỗ trợ khách hàng</b>
          <Link to="/track-order">Tra cứu đơn hàng</Link>
          <a>Chính sách vận chuyển</a>
          <a>Chính sách bảo hành</a>
          <a>Đổi trả & hoàn tiền</a>
        </div>
        <div>
          <b>Liên hệ</b>
          <p>
            <CustomerServiceOutlined /> 1900 6868
          </p>
          <p>
            <InboxOutlined /> support@nexuspc.vn
          </p>
          <p>
            <EnvironmentOutlined /> Hà Nội, Việt Nam
          </p>
        </div>
      </div>
      <div className="container footbottom">
        © 2026 NEXUS PC. All rights reserved.
        <span>Thanh toán an toàn · Bảo hành chính hãng</span>
      </div>
    </footer>
  );
}
function Title({ eyebrow, title, desc, action }) {
  return (
    <div className="section-title">
      <div>
        <small>{eyebrow}</small>
        <h2>{title}</h2>
        {desc && <p>{desc}</p>}
      </div>
      {action}
    </div>
  );
}
function ProductCard({ p, add, favs, toggleFav, compare, toggleCompare }) {
  return (
    <article className="product">
      <div className="pimg">
        {p.tag && (
          <b className={"ribbon " + p.tag.replace(" ", "-").toLowerCase()}>
            {p.tag}
          </b>
        )}
        <Link to={"/product/" + p.id}>
          <img src={p.image} alt={p.name} />
        </Link>
        <button
          className={"fav " + (favs.includes(p.id) ? "liked" : "")}
          onClick={() => toggleFav(p.id)}
        >
          {favs.includes(p.id) ? <HeartFilled /> : <HeartOutlined />}
        </button>
        <Checkbox
          checked={compare.includes(p.id)}
          onChange={() => toggleCompare(p.id)}
        >
          So sánh
        </Checkbox>
      </div>
      <div className="pbody">
        <small>{catName(p.category)}</small>
        <Link className="pname" to={"/product/" + p.id}>
          {p.name}
        </Link>
        <div className="specs">
          {p.specs.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="rating">
          <StarFilled /> <b>{p.rating}</b> <span>({p.reviews} đánh giá)</span>
        </div>
        <strong>{money(p.price)}</strong>
        {p.oldPrice && <del>{money(p.oldPrice)}</del>}
        <div className="pfoot">
          <span className="stock">● Còn {p.stock} sản phẩm</span>
          <button onClick={() => add(p)}>
            <ShoppingCartOutlined />
          </button>
        </div>
      </div>
    </article>
  );
}
function Home(props) {
  return (
    <main>
      <section className="hero container">
        <div className="hero-copy">
          <small className="kicker">● PERFORMANCE. PRECISION. PERSONAL.</small>
          <h1>
            Build your
            <br />
            <em>next level.</em>
          </h1>
          <p>
            Linh kiện PC chính hãng. Cấu hình chuẩn nhu cầu. Hiệu năng vượt mong
            đợi.
          </p>
          <div className="hero-ctas">
            <Link to="/products">
              <Button type="primary" size="large">
                Khám phá linh kiện <ArrowRightOutlined />
              </Button>
            </Link>
            <Link to="/builder">
              <DesktopOutlined /> Tự build PC
            </Link>
          </div>
          <div className="stats">
            <div>
              <b>2.500+</b>
              <small>Sản phẩm</small>
            </div>
            <div>
              <b>98%</b>
              <small>Khách hài lòng</small>
            </div>
            <div>
              <b>24/7</b>
              <small>Hỗ trợ kỹ thuật</small>
            </div>
          </div>
        </div>
        <div className="hero-art">
          <div className="glow" />
          <img
            src="https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=1200&q=90"
            alt="PC gaming"
          />
          <div className="float">
            <ThunderboltFilled />
            <span>
              <b>POWER UP</b>
              <small>Không giới hạn hiệu năng</small>
            </span>
          </div>
          <label>NEXUS / 2026</label>
        </div>
      </section>
      <div className="container benefits">
        <div>
          <TruckOutlined />
          <span>
            <b>Giao hàng toàn quốc</b>
            <small>Đóng gói an toàn</small>
          </span>
        </div>
        <div>
          <SafetyCertificateOutlined />
          <span>
            <b>Chính hãng 100%</b>
            <small>Bảo hành minh bạch</small>
          </span>
        </div>
        <div>
          <CustomerServiceOutlined />
          <span>
            <b>Tư vấn chuyên sâu</b>
            <small>Chọn đúng cấu hình</small>
          </span>
        </div>
        <div>
          <CreditCardOutlined />
          <span>
            <b>Thanh toán linh hoạt</b>
            <small>Nhiều phương thức</small>
          </span>
        </div>
      </div>
      <section className="container section" id="categories">
        <Reveal>
          <Title
            eyebrow="EXPLORE COMPONENTS"
            title="Danh mục linh kiện"
            desc="Mọi thứ bạn cần để hoàn thiện dàn PC trong mơ."
            action={
              <Link className="textlink" to="/products">
                Tất cả danh mục <ArrowRightOutlined />
              </Link>
            }
          />
        </Reveal>
        <div className="cats">
          {categories.map((c, i) => (
            <Reveal key={c.id} delay={i * 40}>
              <Link to={"/products?category=" + c.id} className="cat">
                <i>{c.icon}</i>
                <span>
                  <b>{c.name}</b>
                  <small>{c.count} sản phẩm</small>
                </span>
                <RightOutlined />
              </Link>
            </Reveal>
          ))}
        </div>
      </section>
      <section className="container section">
        <Reveal>
          <Title
            eyebrow="STAFF PICKS"
            title="Sản phẩm nổi bật"
            desc="Những lựa chọn được khách hàng NEXUS PC quan tâm."
            action={
              <Link className="textlink" to="/products">
                Xem tất cả <ArrowRightOutlined />
              </Link>
            }
          />
        </Reveal>
        <div className="products">
          {products.slice(0, 4).map((p, i) => (
            <Reveal key={p.id} delay={i * 65}>
              <ProductCard p={p} {...props} />
            </Reveal>
          ))}
        </div>
      </section>
      <section className="container promo" id="deals">
        <div>
          <small> NEXUS PC BUILDER</small>
          <h2>Build it your way.</h2>
          <p>
            Chọn từng linh kiện. Kiểm tra tương thích. Hoàn thiện cấu hình theo
            ngân sách của bạn.
          </p>
          <Link to="/builder">
            <Button type="primary">
              Bắt đầu build PC <ArrowRightOutlined />
            </Button>
          </Link>
        </div>
        <img
          src="https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=1000&q=85"
          alt="PC setup"
        />
      </section>
      <section className="container section">
        <Reveal>
          <Title
            eyebrow="DEALS YOU SHOULD NOT MISS"
            title="Ưu đãi nổi bật"
            action={
              <Link className="textlink" to="/products?sort=discount">
                Khám phá ưu đãi <ArrowRightOutlined />
              </Link>
            }
          />
        </Reveal>
        <div className="products">
          {products.slice(4, 8).map((p, i) => (
            <Reveal key={p.id} delay={i * 60}>
              <ProductCard p={p} {...props} />
            </Reveal>
          ))}
        </div>
      </section>
      <section className="trust">
        <div className="container">
          <div>
            <small>THE NEXUS STANDARD</small>
            <h2>
              Không chỉ bán linh kiện.
              <br />
              <em>Chúng tôi build trải nghiệm.</em>
            </h2>
          </div>
          <div>
            <p>
              <CheckCircleFilled /> Tư vấn theo nhu cầu thực tế
            </p>
            <p>
              <CheckCircleFilled /> Kiểm tra linh kiện trước khi giao
            </p>
            <p>
              <CheckCircleFilled /> Hỗ trợ kỹ thuật sau mua hàng
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
function Breadcrumb({ items }) {
  return (
    <div className="crumb">
      <Link to="/">Trang chủ</Link>
      {items.map((x, i) => (
        <span key={i}>›　{x}</span>
      ))}
    </div>
  );
}
function Listing(props) {
  const loc = useLocation(),
    params = new URLSearchParams(loc.search);
  const [cat, setCat] = useState(params.get("category") || "all"),
    [search, setSearch] = useState(params.get("search") || ""),
    [sort, setSort] = useState(params.get("sort") || "featured"),
    [brands, setBrands] = useState([]),
    [max, setMax] = useState(35000000);
  useEffect(() => {
    setCat(params.get("category") || "all");
    setSearch(params.get("search") || "");
    setSort(params.get("sort") || "featured");
  }, [loc.search]);
  let list = useMemo(() => {
    let a = products.filter(
      (p) =>
        (cat === "all" || p.category === cat) &&
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        p.price <= max &&
        (!brands.length || brands.includes(p.brand))
    );
    if (sort === "price-asc") a.sort((x, y) => x.price - y.price);
    if (sort === "price-desc") a.sort((x, y) => y.price - x.price);
    if (sort === "discount")
      a.sort((x, y) => y.oldPrice - y.price - (x.oldPrice - x.price));
    return a;
  }, [cat, search, sort, brands, max]);
  return (
    <main className="container page">
      <Breadcrumb items={["Sản phẩm"]} />
      <div className="pagehead">
        <div>
          <small>NEXUS COMPONENT STORE</small>
          <h1>{cat === "all" ? "Tất cả sản phẩm" : catName(cat)}</h1>
          <p>Tìm đúng linh kiện. Hoàn thiện cấu hình theo cách của bạn.</p>
        </div>
        <span>{list.length} sản phẩm</span>
      </div>
      <div className="catalog">
        <aside className="filters">
          <b>
            <FilterOutlined /> Bộ lọc{" "}
            <button
              onClick={() => {
                setCat("all");
                setBrands([]);
                setMax(35000000);
                setSearch("");
              }}
            >
              Xóa lọc
            </button>
          </b>
          <Divider />
          <h4>Danh mục</h4>
          {categories.map((c) => (
            <button
              className={cat === c.id ? "sel" : ""}
              onClick={() => setCat(cat === c.id ? "all" : c.id)}
              key={c.id}
            >
              {c.name}
              <span>{c.count}</span>
            </button>
          ))}
          <Divider />
          <h4>Giá tối đa</h4>
          <Slider
            min={0}
            max={35000000}
            step={500000}
            value={max}
            onChange={setMax}
          />
          <small>{money(max)}</small>
          <Divider />
          <h4>Thương hiệu</h4>
          <Checkbox.Group
            value={brands}
            onChange={setBrands}
            options={[
              "ASUS",
              "MSI",
              "AMD",
              "Kingston",
              "Samsung",
              "Corsair",
              "NZXT",
              "DeepCool",
            ].map((x) => ({ label: x, value: x }))}
          />
        </aside>
        <div>
          <div className="toolbar">
            <Input
              prefix={<SearchOutlined />}
              placeholder="Tìm sản phẩm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
            />
            <Select
              value={sort}
              onChange={setSort}
              options={[
                { value: "featured", label: "Nổi bật" },
                { value: "price-asc", label: "Giá thấp đến cao" },
                { value: "price-desc", label: "Giá cao đến thấp" },
                { value: "discount", label: "Đang giảm giá" },
              ]}
            />
          </div>
          {list.length ? (
            <div className="products three">
              {list.map((p, i) => (
                <Reveal key={p.id} delay={(i % 3) * 45}>
                  <ProductCard p={p} {...props} />
                </Reveal>
              ))}
            </div>
          ) : (
            <Empty description="Không tìm thấy sản phẩm phù hợp" />
          )}
        </div>
      </div>
    </main>
  );
}
function Detail({ add, favs, toggleFav }) {
  const { id } = useParams(),
    p = products.find((x) => x.id === id),
    [qty, setQty] = useState(1);
  if (!p)
    return (
      <main className="container page">
        <Empty description="Không tìm thấy sản phẩm" />
      </main>
    );
  return (
    <main className="container page">
      <Breadcrumb items={["Sản phẩm", p.name]} />
      <div className="detail">
        <div className="detail-image">
          <img src={p.image} alt={p.name} />
        </div>
        <div>
          <small>
            {catName(p.category)} / {p.brand}
          </small>
          <h1>{p.name}</h1>
          <div className="rating">
            <StarFilled /> {p.rating}　({p.reviews} đánh giá)　
            <span className="stock">Còn hàng</span>
          </div>
          <p className="desc">
            {p.description ||
              "Linh kiện hiệu năng cao, được lựa chọn cho hệ thống PC hiện đại."}
          </p>
          <h2>{money(p.price)}</h2>
          {p.oldPrice && <del>{money(p.oldPrice)}</del>}
          <Divider />
          <h4>Thông số nổi bật</h4>
          <div className="spec-list">
            {p.specs.map((s) => (
              <span key={s}>
                <CheckOutlined /> {s}
              </span>
            ))}
          </div>
          <div className="buyrow">
            <InputNumber min={1} max={p.stock} value={qty} onChange={setQty} />
            <Button type="primary" size="large" onClick={() => add(p, qty)}>
              <ShoppingCartOutlined /> Thêm vào giỏ
            </Button>
            <Button
              onClick={() => toggleFav(p.id)}
              icon={favs.includes(p.id) ? <HeartFilled /> : <HeartOutlined />}
            />
          </div>
          <p className="service">
            <SafetyCertificateOutlined /> Bảo hành chính hãng　{" "}
            <TruckOutlined /> Giao hàng toàn quốc
          </p>
        </div>
      </div>
    </main>
  );
}
function Compare({ compare, toggle, add }) {
  let chosen = products.filter((p) => compare.includes(p.id));
  return (
    <main className="container page">
      <Breadcrumb items={["So sánh sản phẩm"]} />
      <div className="pagehead">
        <div>
          <small>MAKE THE RIGHT CHOICE</small>
          <h1>So sánh sản phẩm</h1>
          <p>Đặt các lựa chọn cạnh nhau để tìm linh kiện phù hợp.</p>
        </div>
      </div>
      {chosen.length < 2 ? (
        <div className="emptybox">
          <SwapOutlined />
          <h3>Chọn ít nhất 2 sản phẩm để so sánh</h3>
          <Link to="/products">
            <Button type="primary">Khám phá sản phẩm</Button>
          </Link>
        </div>
      ) : (
        <div className="comparetable">
          <div className="compare-row">
            <b>Thông tin</b>
            {chosen.map((p) => (
              <span key={p.id}>
                <img src={p.image} />
                {p.name}
                <button onClick={() => toggle(p.id)}>Xóa</button>
              </span>
            ))}
          </div>
          {[
            ["Giá", ...chosen.map((p) => money(p.price))],
            ["Thương hiệu", ...chosen.map((p) => p.brand)],
            ["Danh mục", ...chosen.map((p) => catName(p.category))],
            ["Thông số", ...chosen.map((p) => p.specs.join(" · "))],
            ["Đánh giá", ...chosen.map((p) => p.rating + "/5")],
          ].map((r) => (
            <div className="compare-row" key={r[0]}>
              {r.map((v, i) => (
                <span key={i}>{v}</span>
              ))}
            </div>
          ))}
          <div className="compare-row">
            <b></b>
            {chosen.map((p) => (
              <Button key={p.id} type="primary" onClick={() => add(p)}>
                Thêm vào giỏ
              </Button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
const slots = [
  ["cpu", "Bộ vi xử lý"],
  ["mainboard", "Bo mạch chủ"],
  ["ram", "Bộ nhớ RAM"],
  ["gpu", "Card đồ họa"],
  ["ssd", "Ổ cứng"],
  ["psu", "Nguồn"],
  ["case", "Vỏ case"],
  ["cooler", "Tản nhiệt"],
];
function Builder({ add }) {
  const [build, setBuild] = useState({}),
    [active, setActive] = useState(null);
  let total = Object.values(build).reduce((s, p) => s + p.price, 0),
    slot = slots.find((s) => s[0] === active);
  return (
    <main className="container page">
      <Breadcrumb items={["PC Builder"]} />
      <div className="pagehead">
        <div>
          <small>CONFIGURE YOUR RIG</small>
          <h1>PC Builder</h1>
          <p>Tự tay lựa chọn linh kiện và xây dựng cấu hình theo ngân sách.</p>
        </div>
        <Tag color="processing">Bản dựng của bạn</Tag>
      </div>
      <div className="builder">
        <div className="slotlist">
          {slots.map(([id, label], i) => (
            <div className="slot" key={id}>
              <b>{String(i + 1).padStart(2, "0")}</b>
              <span>
                <strong>{label}</strong>
                <small>{build[id]?.name || "Chưa chọn linh kiện"}</small>
              </span>
              {build[id] && <em>{money(build[id].price)}</em>}
              <Button
                onClick={() => setActive(id)}
                type={build[id] ? "default" : "primary"}
              >
                {build[id] ? "Thay đổi" : "Chọn linh kiện"}
              </Button>
              {build[id] && (
                <button
                  onClick={() =>
                    setBuild((v) => {
                      let n = { ...v };
                      delete n[id];
                      return n;
                    })
                  }
                >
                  <DeleteOutlined />
                </button>
              )}
            </div>
          ))}
        </div>
        <aside className="summary">
          <small>BUILD SUMMARY</small>
          <h3>Cấu hình của bạn</h3>
          <h2>
            {Object.keys(build).length}
            <small> / 8 linh kiện</small>
          </h2>
          <div className="progress">
            <i style={{ width: (Object.keys(build).length / 8) * 100 + "%" }} />
          </div>
          {Object.entries(build).map(([k, p]) => (
            <p key={k}>
              {slots.find((s) => s[0] === k)?.[1]} <b>{money(p.price)}</b>
            </p>
          ))}
          <Divider />
          Tổng tạm tính<h3 className="orange">{money(total)}</h3>
          <Button
            type="primary"
            block
            disabled={!Object.keys(build).length}
            onClick={() => Object.values(build).forEach((p) => add(p))}
          >
            Thêm cấu hình vào giỏ
          </Button>
          <small className="muted">
            Kiểm tra tương thích chuyên sâu sẽ được bổ sung khi kết nối dữ liệu
            kỹ thuật.
          </small>
        </aside>
      </div>
      <Drawer
        title={"Chọn " + (slot?.[1] || "linh kiện")}
        open={!!active}
        onClose={() => setActive(null)}
      >
        <div className="picklist">
          {products
            .filter((p) => p.category === active)
            .map((p) => (
              <div key={p.id}>
                <img src={p.image} />
                <span>
                  <b>{p.name}</b>
                  <strong>{money(p.price)}</strong>
                </span>
                <Button
                  type="primary"
                  onClick={() => {
                    setBuild((v) => ({ ...v, [active]: p }));
                    setActive(null);
                  }}
                >
                  Chọn
                </Button>
              </div>
            ))}
        </div>
      </Drawer>
    </main>
  );
}
function CartContents({ cart, qty, remove }) {
  return cart.length ? (
    <div className="cartitems">
      {cart.map((p) => (
        <div className="cartitem" key={p.id}>
          <img src={p.image} />
          <span>
            <Link to={"/product/" + p.id}>{p.name}</Link>
            <b>{money(p.price)}</b>
            <div className="qty">
              <button onClick={() => qty(p.id, p.qty - 1)}>
                <MinusOutlined />
              </button>
              {p.qty}
              <button onClick={() => qty(p.id, p.qty + 1)}>
                <PlusOutlined />
              </button>
            </div>
          </span>
          <button onClick={() => remove(p.id)}>
            <DeleteOutlined />
          </button>
        </div>
      ))}
    </div>
  ) : (
    <div className="emptycart">
      <ShoppingCartOutlined />
      <h3>Giỏ hàng đang trống</h3>
      <p>Khám phá linh kiện và thêm sản phẩm bạn yêu thích.</p>
      <Link to="/products">
        <Button type="primary">Tiếp tục mua sắm</Button>
      </Link>
    </div>
  );
}
function Cart({ cart, qty, remove }) {
  let total = cart.reduce((s, p) => s + p.price * p.qty, 0),
    nav = useNavigate();
  return (
    <main className="container page">
      <Breadcrumb items={["Giỏ hàng"]} />
      <div className="pagehead">
        <div>
          <small>YOUR SELECTION</small>
          <h1>Giỏ hàng</h1>
          <p>Kiểm tra lại sản phẩm trước khi thanh toán.</p>
        </div>
      </div>
      <div className="cartlayout">
        <div className="cartbox">
          <CartContents cart={cart} qty={qty} remove={remove} />
        </div>
        <aside className="summary">
          <h3>Tóm tắt đơn hàng</h3>
          <p>
            Tạm tính <b>{money(total)}</b>
          </p>
          <p>
            Vận chuyển <b className="stock">Miễn phí*</b>
          </p>
          <Divider />
          Tổng cộng<h2 className="orange">{money(total)}</h2>
          <Button
            block
            type="primary"
            disabled={!cart.length}
            onClick={() => nav("/checkout")}
          >
            Tiến hành thanh toán
          </Button>
          <Link to="/products">← Tiếp tục mua sắm</Link>
        </aside>
      </div>
    </main>
  );
}
function Checkout({ cart, clear }) {
  const [step, setStep] = useState(0),
    [method, setMethod] = useState("cod"),
    [done, setDone] = useState(false);
  let total = cart.reduce((s, p) => s + p.price * p.qty, 0);
  if (done)
    return (
      <main className="container page">
        <div className="success">
          <CheckCircleFilled />
          <h1>Đặt hàng thành công!</h1>
          <p>
            Cảm ơn bạn đã mua sắm tại NEXUS PC. Đây là luồng demo frontend, chưa
            gửi đơn đến backend.
          </p>
          <Link to="/">
            <Button type="primary">Về trang chủ</Button>
          </Link>
        </div>
      </main>
    );
  if (!cart.length)
    return (
      <main className="container page">
        <Empty description="Bạn chưa có sản phẩm để thanh toán">
          <Link to="/products">
            <Button type="primary">Mua sắm ngay</Button>
          </Link>
        </Empty>
      </main>
    );
  return (
    <main className="container page">
      <Breadcrumb items={["Giỏ hàng", "Thanh toán"]} />
      <div className="pagehead">
        <div>
          <small>SECURE CHECKOUT</small>
          <h1>Thanh toán</h1>
          <p>Hoàn tất thông tin nhận hàng của bạn.</p>
        </div>
      </div>
      <Steps
        current={step}
        items={[
          { title: "Thông tin giao hàng" },
          { title: "Thanh toán" },
          { title: "Xác nhận" },
        ]}
      />
      <div className="checkout">
        <div className="checkoutform">
          <h3>
            {
              [
                "Thông tin người nhận",
                "Phương thức thanh toán",
                "Xác nhận đơn hàng",
              ][step]
            }
          </h3>
          {step === 0 ? (
            <div className="formgrid">
              <label>
                Họ và tên
                <Input placeholder="Nguyễn Văn A" />
              </label>
              <label>
                Số điện thoại
                <Input placeholder="09xx xxx xxx" />
              </label>
              <label>
                Email
                <Input placeholder="email@example.com" />
              </label>
              <label>
                Tỉnh / Thành phố
                <Select
                  placeholder="Chọn tỉnh thành"
                  options={[
                    "Hà Nội",
                    "TP. Hồ Chí Minh",
                    "Đà Nẵng",
                    "Hải Phòng",
                  ].map((x) => ({ label: x, value: x }))}
                />
              </label>
              <label className="wide">
                Địa chỉ nhận hàng
                <Input placeholder="Số nhà, đường, phường/xã..." />
              </label>
              <label className="wide">
                Ghi chú
                <Input placeholder="Ghi chú (không bắt buộc)" />
              </label>
            </div>
          ) : step === 1 ? (
            <Radio.Group
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="payments"
            >
              <Radio value="cod">Thanh toán khi nhận hàng (COD)</Radio>
              <Radio value="bank">Chuyển khoản ngân hàng</Radio>
              <Radio value="card">Thẻ ATM / Visa / MasterCard</Radio>
            </Radio.Group>
          ) : (
            <p>
              Phương thức:{" "}
              {method === "cod"
                ? "Thanh toán khi nhận hàng"
                : method === "bank"
                ? "Chuyển khoản"
                : "Thẻ thanh toán"}
              <br />
              Tổng thanh toán: <b>{money(total)}</b>
            </p>
          )}
          <div className="actions">
            {step > 0 && (
              <Button onClick={() => setStep(step - 1)}>Quay lại</Button>
            )}
            <Button
              type="primary"
              onClick={() =>
                step < 2 ? setStep(step + 1) : (clear(), setDone(true))
              }
            >
              {step < 2 ? "Tiếp tục" : "Xác nhận đặt hàng"}
            </Button>
          </div>
        </div>
        <aside className="summary">
          <h3>Đơn hàng ({cart.length})</h3>
          {cart.map((p) => (
            <p key={p.id}>
              {p.name} × {p.qty}
              <b>{money(p.price * p.qty)}</b>
            </p>
          ))}
          <Divider />
          <h3 className="orange">{money(total)}</h3>
        </aside>
      </div>
    </main>
  );
}
function Account() {
  const [tab, setTab] = useState("profile");
  return (
    <main className="container page">
      <Breadcrumb items={["Tài khoản"]} />
      <div className="pagehead">
        <div>
          <small>YOUR NEXUS ACCOUNT</small>
          <h1>Tài khoản của tôi</h1>
          <p>Quản lý thông tin cá nhân và lịch sử mua sắm.</p>
        </div>
      </div>
      <div className="account">
        <aside>
          <b>
            <UserOutlined /> Khách hàng NEXUS
          </b>
          {[
            ["profile", "Thông tin tài khoản"],
            ["orders", "Đơn hàng của tôi"],
            ["addresses", "Sổ địa chỉ"],
            ["security", "Bảo mật tài khoản"],
          ].map(([k, v]) => (
            <button
              className={tab === k ? "active" : ""}
              onClick={() => setTab(k)}
              key={k}
            >
              {v}
            </button>
          ))}
          <button>
            <LogoutOutlined /> Đăng xuất
          </button>
        </aside>
        <section>
          <h3>
            {
              {
                profile: "Thông tin tài khoản",
                orders: "Đơn hàng của tôi",
                addresses: "Sổ địa chỉ",
                security: "Bảo mật tài khoản",
              }[tab]
            }
          </h3>
          {tab === "profile" ? (
            <div className="formgrid">
              <label>
                Họ và tên
                <Input defaultValue="Khách hàng NEXUS" />
              </label>
              <label>
                Email
                <Input placeholder="email@example.com" />
              </label>
              <label>
                Số điện thoại
                <Input placeholder="Nhập số điện thoại" />
              </label>
              <label>
                Ngày sinh
                <Input type="date" />
              </label>
              <Button
                type="primary"
                onClick={() => message.success("Đã lưu thông tin demo")}
              >
                Lưu thay đổi
              </Button>
            </div>
          ) : tab === "orders" ? (
            <Empty description="Bạn chưa có đơn hàng nào" />
          ) : tab === "addresses" ? (
            <Empty description="Bạn chưa lưu địa chỉ nhận hàng" />
          ) : (
            <div className="formgrid">
              <label>
                Mật khẩu hiện tại
                <Input.Password />
              </label>
              <label>
                Mật khẩu mới
                <Input.Password />
              </label>
              <Button type="primary">Cập nhật mật khẩu</Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
function Track() {
  const [code, setCode] = useState(""),
    [show, setShow] = useState(false);
  return (
    <main className="container page">
      <div className="track">
        <small>ORDER TRACKING</small>
        <h1>Tra cứu đơn hàng</h1>
        <p>Nhập mã đơn hàng để kiểm tra trạng thái.</p>
        <div>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Ví dụ: NX20260001"
          />
          <Button type="primary" onClick={() => setShow(true)}>
            Tra cứu
          </Button>
        </div>
        {show && (
          <p className="notice">
            <InfoCircleOutlined /> Giao diện minh họa. Chức năng tra cứu sẽ hoạt
            động khi kết nối API đơn hàng.
          </p>
        )}
      </div>
    </main>
  );
}
function Auth() {
  const [mode, setMode] = useState("login");
  return (
    <main className="auth">
      <section>
        <Logo />
        <small>WELCOME TO NEXUS</small>
        <h1>
          {mode === "login" ? "Chào mừng trở lại." : "Tạo tài khoản mới."}
        </h1>
        <p>Đăng nhập để quản lý đơn hàng và trải nghiệm mua sắm.</p>
        {mode === "register" && <Input placeholder="Họ và tên" />}
        <Input placeholder="Email hoặc số điện thoại" />
        <Input.Password placeholder="Mật khẩu" />
        {mode === "register" && (
          <Input.Password placeholder="Nhập lại mật khẩu" />
        )}
        <Button
          type="primary"
          block
          size="large"
          onClick={() =>
            message.info("Chức năng xác thực sẽ kết nối backend sau.")
          }
        >
          {mode === "login" ? "Đăng nhập" : "Đăng ký tài khoản"}
        </Button>
        <p>
          {mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?"}{" "}
          <button
            onClick={() => setMode(mode === "login" ? "register" : "login")}
          >
            {mode === "login" ? "Đăng ký" : "Đăng nhập"}
          </button>
        </p>
      </section>
      <aside>
        <small>PERFORMANCE STARTS HERE</small>
        <h2>
          Build your
          <br />
          <em>next level.</em>
        </h2>
      </aside>
    </main>
  );
}
export default function App() {
  const [cart, setCart] = useState(() =>
      JSON.parse(localStorage.getItem("nexus-cart") || "[]")
    ),
    [favs, setFavs] = useState(() =>
      JSON.parse(localStorage.getItem("nexus-favs") || "[]")
    ),
    [compare, setCompare] = useState([]),
    [drawer, setDrawer] = useState(false);
  const loc = useLocation(),
    nav = useNavigate();
  useEffect(() => {
    localStorage.setItem("nexus-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem("nexus-favs", JSON.stringify(favs));
  }, [favs]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [loc.pathname]);
  const add = (p, q = 1) => {
    setCart((old) =>
      old.some((x) => x.id === p.id)
        ? old.map((x) => (x.id === p.id ? { ...x, qty: x.qty + q } : x))
        : [...old, { ...p, qty: q }]
    );
    message.success("Đã thêm sản phẩm vào giỏ hàng");
  };
  const qty = (id, n) =>
    setCart((old) =>
      n < 1
        ? old.filter((x) => x.id !== id)
        : old.map((x) => (x.id === id ? { ...x, qty: n } : x))
    );
  const remove = (id) => setCart((old) => old.filter((x) => x.id !== id));
  const toggleFav = (id) =>
    setFavs((old) =>
      old.includes(id) ? old.filter((x) => x !== id) : [...old, id]
    );
  const toggleCompare = (id) =>
    setCompare((old) =>
      old.includes(id)
        ? old.filter((x) => x !== id)
        : old.length >= 4
        ? (message.warning("Tối đa 4 sản phẩm"), old)
        : [...old, id]
    );
  const props = { add, favs, toggleFav, compare, toggleCompare };
  const count = cart.reduce((s, x) => s + x.qty, 0);
  return (
    <>
      <Header count={count} onCart={() => setDrawer(true)} />
      <Routes>
        <Route path="/" element={<Home {...props} />} />
        <Route path="/products" element={<Listing {...props} />} />
        <Route
          path="/product/:id"
          element={<Detail add={add} favs={favs} toggleFav={toggleFav} />}
        />
        <Route
          path="/compare"
          element={
            <Compare compare={compare} toggle={toggleCompare} add={add} />
          }
        />
        <Route path="/builder" element={<Builder add={add} />} />
        <Route
          path="/cart"
          element={<Cart cart={cart} qty={qty} remove={remove} />}
        />
        <Route
          path="/checkout"
          element={<Checkout cart={cart} clear={() => setCart([])} />}
        />
        <Route path="/account" element={<Account />} />
        <Route path="/account/orders" element={<Account />} />
        <Route path="/track-order" element={<Track />} />
        <Route path="/login" element={<Auth />} />
        <Route
          path="*"
          element={
            <main className="container page">
              <Empty description="Trang không tồn tại">
                <Link to="/">
                  <Button type="primary">Về trang chủ</Button>
                </Link>
              </Empty>
            </main>
          }
        />
      </Routes>
      <Footer />
      <Drawer
        title="Giỏ hàng"
        open={drawer}
        onClose={() => setDrawer(false)}
        width={460}
        footer={
          cart.length > 0 ? (
            <div className="drawer-foot">
              <b>{money(cart.reduce((s, p) => s + p.price * p.qty, 0))}</b>
              <Button
                type="primary"
                block
                onClick={() => {
                  setDrawer(false);
                  nav("/checkout");
                }}
              >
                Tiến hành thanh toán
              </Button>
              <Link to="/cart" onClick={() => setDrawer(false)}>
                Xem giỏ hàng
              </Link>
            </div>
          ) : null
        }
      >
        <CartContents cart={cart} qty={qty} remove={remove} />
      </Drawer>
      {compare.length > 0 && (
        <div className="compare-float">
          <span>{compare.length} sản phẩm đã chọn</span>
          <Link to="/compare">
            <Button type="primary" icon={<SwapOutlined />}>
              So sánh ngay
            </Button>
          </Link>
          <button onClick={() => setCompare([])}>×</button>
        </div>
      )}
    </>
  );
}
