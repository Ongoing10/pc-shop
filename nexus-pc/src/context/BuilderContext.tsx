import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { BuilderSlotId, Product, RigBuild } from '../types/product';
import { PcBuild, PcBuildItem } from '../types/pcBuild';
import { storageService } from '../services/storage/storageService';
import { CompatibilityLine } from '../services/api/compatibilityService';

/** Cấu hình đã lưu đang được mở để sửa */
export interface EditingBuild {
  code: string;
  name: string;
  purpose?: string;
  isPublic: boolean;
}

interface StoredBuilderState {
  items: PcBuildItem[];
  editing: EditingBuild | null;
}

interface BuilderContextType {
  rig: RigBuild;
  quantities: Partial<Record<BuilderSlotId, number>>;
  lines: Array<CompatibilityLine & { slot: BuilderSlotId }>;
  items: PcBuildItem[];
  editing: EditingBuild | null;
  setPart: (slot: BuilderSlotId, product: Product) => void;
  removePart: (slot: BuilderSlotId) => void;
  setQuantity: (slot: BuilderSlotId, quantity: number) => void;
  loadBuild: (build: PcBuild, asCopy?: boolean) => void;
  setEditing: (editing: EditingBuild | null) => void;
  clear: () => void;
}

const BuilderContext = createContext<BuilderContextType | undefined>(undefined);

const BUILDER_KEY = 'nexus_builder_state';
export const MAX_SLOT_QUANTITY = 8;

export const BuilderProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoredBuilderState>(() =>
    storageService.get<StoredBuilderState>(BUILDER_KEY, { items: [], editing: null })
  );

  useEffect(() => {
    storageService.set(BUILDER_KEY, state);
  }, [state]);

  const lines = useMemo(
    () =>
      // Mỗi dòng mang theo sản phẩm (snapshot lúc chọn); dòng lưu từ phiên bản cũ không có sản phẩm thì bỏ qua
      state.items.flatMap((item) =>
        item.product ? [{ slot: item.slot, product: item.product, quantity: item.quantity }] : []
      ),
    [state.items]
  );

  const rig = useMemo<RigBuild>(
    () => Object.fromEntries(lines.map((l) => [l.slot, l.product])) as RigBuild,
    [lines]
  );

  const quantities = useMemo(
    () => Object.fromEntries(lines.map((l) => [l.slot, l.quantity])) as Partial<Record<BuilderSlotId, number>>,
    [lines]
  );

  const setPart = (slot: BuilderSlotId, product: Product) => {
    setState((prev) => ({
      ...prev,
      items: [
        ...prev.items.filter((i) => i.slot !== slot),
        { slot, productId: product.id, quantity: 1, product },
      ],
    }));
  };

  const removePart = (slot: BuilderSlotId) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((i) => i.slot !== slot) }));
  };

  const setQuantity = (slot: BuilderSlotId, quantity: number) => {
    const next = Math.min(MAX_SLOT_QUANTITY, Math.max(1, quantity));
    setState((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.slot === slot ? { ...i, quantity: next } : i)),
    }));
  };

  const loadBuild = (build: PcBuild, asCopy = false) => {
    setState({
      // Sản phẩm đã ngừng bán / bị ẩn không còn trong cấu hình
      items: build.items.filter((i) => i.product),
      editing: asCopy
        ? null
        : { code: build.code, name: build.name, purpose: build.purpose, isPublic: build.isPublic },
    });
  };

  const setEditing = (editing: EditingBuild | null) => setState((prev) => ({ ...prev, editing }));

  const clear = () => setState({ items: [], editing: null });

  return (
    <BuilderContext.Provider
      value={{
        rig,
        quantities,
        lines,
        items: state.items,
        editing: state.editing,
        setPart,
        removePart,
        setQuantity,
        loadBuild,
        setEditing,
        clear,
      }}
    >
      {children}
    </BuilderContext.Provider>
  );
};

export const useBuilder = (): BuilderContextType => {
  const context = useContext(BuilderContext);
  if (!context) {
    throw new Error('useBuilder must be used within a BuilderProvider');
  }
  return context;
};
