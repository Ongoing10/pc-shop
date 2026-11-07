import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import "antd/dist/reset.css";
import "./style.css";
import App from "./App";
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: "#ff6b2c",
          colorBgBase: "#101114",
          colorTextBase: "#f4f4f5",
          borderRadius: 10,
          fontFamily: "'Be Vietnam Pro',sans-serif",
          controlHeight: 42,
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>
);
