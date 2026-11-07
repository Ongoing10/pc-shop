import React from 'react';
import { Progress, Tag } from 'antd';
import { useTranslation } from 'react-i18next';
import { FiCheckCircle, FiAlertTriangle, FiXCircle, FiZap } from 'react-icons/fi';
import { CompatibilityResult } from '../../types/pcBuild';

/** Nhãn ngắn: tương thích / có cảnh báo / số lỗi */
export const CompatBadge: React.FC<{ result: CompatibilityResult }> = ({ result }) => {
  const { t } = useTranslation();
  const errors = result.issues.filter((i) => i.severity === 'ERROR').length;
  const warnings = result.issues.length - errors;

  if (errors > 0) {
    return (
      <Tag color="error" bordered={false} className="compat-badge" icon={<FiXCircle aria-hidden="true" />}>
        {t('builder.errorCount', { count: errors, defaultValue: `${errors} lỗi tương thích` })}
      </Tag>
    );
  }
  if (warnings > 0) {
    return (
      <Tag color="warning" bordered={false} className="compat-badge" icon={<FiAlertTriangle aria-hidden="true" />}>
        {t('builder.warningCount', { count: warnings, defaultValue: `${warnings} cảnh báo` })}
      </Tag>
    );
  }
  return (
    <Tag color="success" bordered={false} className="compat-badge" icon={<FiCheckCircle aria-hidden="true" />}>
      {t('builder.compatible', 'Tương thích')}
    </Tag>
  );
};

interface CompatibilityPanelProps {
  result: CompatibilityResult;
  /** Công suất nguồn đã chọn (W), để vẽ thanh tải */
  psuWattage?: number;
  /** Số linh kiện đã chọn; dưới 2 thì chưa có gì để kiểm tra */
  partCount: number;
}

export const CompatibilityPanel: React.FC<CompatibilityPanelProps> = ({ result, psuWattage, partCount }) => {
  const { t } = useTranslation();
  const load = psuWattage ? Math.min(1, result.estimatedWattage / psuWattage) : 0;
  const loadColor = load > 1 / 1.2 ? (load >= 1 ? 'var(--danger)' : 'var(--warn)') : 'var(--ok)';

  return (
    <section className="compat-panel" aria-live="polite">
      <header>
        <b>{t('builder.compatTitle', 'Kiểm tra tương thích')}</b>
        {partCount >= 2 && <CompatBadge result={result} />}
      </header>

      {partCount < 2 ? (
        <p className="compat-empty">
          {t('builder.compatEmpty', 'Chọn từ 2 linh kiện trở lên để hệ thống kiểm tra socket, chuẩn RAM, kích thước và công suất nguồn.')}
        </p>
      ) : result.issues.length === 0 ? (
        <p className="compat-empty ok">
          {t('builder.compatAllGood', 'Các linh kiện đã chọn lắp được với nhau.')}
        </p>
      ) : (
        <ul className="compat-issues">
          {result.issues.map((issue) => (
            <li key={issue.ruleCode} className={issue.severity === 'ERROR' ? 'error' : 'warning'}>
              {issue.severity === 'ERROR' ? <FiXCircle aria-hidden="true" /> : <FiAlertTriangle aria-hidden="true" />}
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="watt">
        <span>
          <FiZap aria-hidden="true" /> {t('builder.estimatedWattage', 'Công suất ước tính')}
        </span>
        <b className="num">
          {result.estimatedWattage}W{psuWattage ? <small> / {psuWattage}W</small> : null}
        </b>
      </div>
      {psuWattage ? (
        <Progress
          className="wattbar"
          percent={load * 100}
          showInfo={false}
          size={{ height: 6 }}
          strokeColor={loadColor}
          railColor="var(--panel)"
          aria-label={`${result.estimatedWattage}W / ${psuWattage}W`}
        />
      ) : (
        partCount > 0 && <small className="muted">{t('builder.noPsu', 'Chưa chọn nguồn để so công suất.')}</small>
      )}
    </section>
  );
};
