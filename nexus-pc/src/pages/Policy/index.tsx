import React, { useEffect, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { Menu, Table } from 'antd';
import { FiHeadphones, FiMail } from 'react-icons/fi';
import { Breadcrumb } from '../../components/common/Breadcrumb';
import { NotFoundPage } from '../NotFound';
import { POLICIES, PolicyBlock, findPolicy } from '../../content/policies';

const Block: React.FC<{ block: PolicyBlock }> = ({ block }) => {
  if (block.type === 'p') return <p>{block.text}</p>;
  if (block.type === 'list') {
    return (
      <ul>
        {block.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  }
  return (
    <Table
      className="policy-table"
      size="middle"
      pagination={false}
      rowKey="0"
      dataSource={block.rows}
      columns={[
        { title: block.head[0], dataIndex: 0, key: 'a', className: 'policy-table-key' },
        { title: block.head[1], dataIndex: 1, key: 'b' },
      ]}
      scroll={{ x: 'max-content' }}
    />
  );
};

export const PolicyPage: React.FC = () => {
  const { slug } = useParams();
  const policy = findPolicy(slug);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (policy) document.title = `${policy.title} · NEXUS PC`;
    // Trên mobile menu là hàng tab cuộn ngang: đưa tab đang mở vào giữa tầm nhìn
    const nav = navRef.current;
    const active = nav?.querySelector<HTMLElement>('.ant-menu-item-selected');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollLeft = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    }
  }, [policy]);

  if (!slug) return <Navigate to={`/policy/${POLICIES[0].slug}`} replace />;
  if (!policy) return <NotFoundPage />;

  return (
    <main className="container page">
      <Breadcrumb items={[{ label: 'Chính sách', link: `/policy/${POLICIES[0].slug}` }, policy.title]} />

      <div className="policy">
        <nav className="policy-nav" aria-label="Các chính sách" ref={navRef}>
          <Menu
            mode="inline"
            inlineIndent={12}
            selectedKeys={[policy.slug]}
            items={POLICIES.map((p) => ({ key: p.slug, label: <Link to={`/policy/${p.slug}`}>{p.title}</Link> }))}
          />
        </nav>

        <article className="policy-body">
          <header>
            <h1>{policy.title}</h1>
            <p className="policy-summary">{policy.summary}</p>
            <small>Cập nhật lần cuối: {policy.updated}</small>
          </header>

          <dl className="policy-facts">
            {policy.facts.map((fact) => (
              <div key={fact.label}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>

          {policy.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.blocks.map((block, i) => (
                <Block key={i} block={block} />
              ))}
            </section>
          ))}

          <aside className="policy-help">
            <b>Cần hỏi thêm về chính sách?</b>
            <a href="tel:19006868">
              <FiHeadphones aria-hidden="true" /> 1900 6868 (8:00–21:30)
            </a>
            <a href="mailto:support@nexuspc.vn">
              <FiMail aria-hidden="true" /> support@nexuspc.vn
            </a>
            <Link to="/about">Về NEXUS PC</Link>
          </aside>
        </article>
      </div>
    </main>
  );
};
