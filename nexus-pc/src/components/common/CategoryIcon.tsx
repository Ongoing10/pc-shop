import React from 'react';
import type { IconType } from 'react-icons';
import {
  BsCpu,
  BsDeviceSsd,
  BsFan,
  BsGpuCard,
  BsLightningCharge,
  BsMemory,
  BsMotherboard,
  BsPc,
} from 'react-icons/bs';

const ICONS: Record<string, IconType> = {
  gpu: BsGpuCard,
  cpu: BsCpu,
  mainboard: BsMotherboard,
  ram: BsMemory,
  ssd: BsDeviceSsd,
  psu: BsLightningCharge,
  case: BsPc,
  cooler: BsFan,
};

export const CategoryIcon: React.FC<{ id: string; className?: string }> = ({ id, className }) => {
  const Icon = ICONS[id] ?? BsCpu;
  return <Icon className={className} aria-hidden="true" />;
};
