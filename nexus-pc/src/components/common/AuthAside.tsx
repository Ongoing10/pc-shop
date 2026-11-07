import React, { ReactNode } from 'react';
import { BsCheck2 } from 'react-icons/bs';
import rigImage from '../../assets/images/hero_custom_pc_rig_1793798677183.jpg';

interface AuthAsideProps {
  title: ReactNode;
  points: string[];
}

/** Cột ảnh bên phải của các màn đăng nhập / đăng ký / khôi phục mật khẩu. */
export const AuthAside: React.FC<AuthAsideProps> = ({ title, points }) => (
  <aside className="auth-aside">
    <img src={rigImage} alt="" aria-hidden="true" />
    <div className="auth-aside-body">
      <h2>{title}</h2>
      <ul>
        {points.map((point) => (
          <li key={point}>
            <BsCheck2 aria-hidden="true" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  </aside>
);
