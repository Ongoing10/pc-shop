import React from 'react';
import { Button, InputNumber } from 'antd';
import { FiMinus, FiPlus } from 'react-icons/fi';

interface QuantityStepperProps {
  value: number;
  /** Số lượng tối đa (tồn kho); không truyền thì không giới hạn */
  max?: number;
  /** Giảm về 0 nghĩa là xóa khỏi giỏ, nên cho phép min = 0 */
  onChange: (quantity: number) => void;
  itemName: string;
}

export const QuantityStepper: React.FC<QuantityStepperProps> = ({ value, max, onChange, itemName }) => (
  <div className="qty">
    <Button
      type="text"
      size="small"
      icon={<FiMinus />}
      onClick={() => onChange(value - 1)}
      aria-label={`Decrease quantity of ${itemName}`}
    />
    <InputNumber
      size="small"
      variant="borderless"
      controls={false}
      min={0}
      max={max}
      value={value}
      onChange={(v) => v !== null && onChange(v)}
      aria-label={`Quantity of ${itemName}`}
    />
    <Button
      type="text"
      size="small"
      icon={<FiPlus />}
      disabled={max !== undefined && value >= max}
      onClick={() => onChange(value + 1)}
      aria-label={`Increase quantity of ${itemName}`}
    />
  </div>
);
