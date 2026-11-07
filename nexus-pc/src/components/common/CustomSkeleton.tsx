import React from 'react';
import { Skeleton } from 'antd';

interface SkeletonProps {
  active?: boolean;
  className?: string;
}

/**
 * ProductCardSkeleton
 * Matches the layout and dimensions of ProductCard using Ant Design's Skeleton and Tailwind CSS.
 */
export const ProductCardSkeleton: React.FC<SkeletonProps> = ({
  active = true,
  className = '',
}) => {
  return (
    <article
      className={`product skeleton-card relative overflow-hidden rounded-[10px] border border-[var(--line-strong)] bg-[var(--panel)] ${className}`}
      data-testid="product-card-skeleton"
    >
      {/* Product Image Area */}
      <div className="pimg relative h-[180px] w-full bg-[var(--panel-2)] flex items-center justify-center overflow-hidden">
        <Skeleton.Node
          active={active}
          style={{ width: '100%', height: '100%', borderRadius: 0 }}
        >
          <div className="flex flex-col items-center justify-center opacity-30">
            <svg
              className="w-10 h-10 text-gray-500 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        </Skeleton.Node>

        {/* Wishlist button placeholder */}
        <div className="absolute top-2.5 right-2.5 w-[30px] h-[30px] rounded-full bg-[rgb(12 12 14 / 0.5)] border border-[var(--line-strong)] flex items-center justify-center">
          <div className="w-3.5 h-3.5 rounded-full bg-[var(--line-strong)]" />
        </div>
      </div>

      {/* Product Body Area */}
      <div className="pbody p-3.5 flex flex-col gap-2">
        {/* Category kicker */}
        <div className="w-16 h-2 rounded bg-[var(--line)] animate-pulse" />

        {/* Product Title (2 lines) */}
        <div className="space-y-1.5 my-1">
          <div className="w-11/12 h-3 rounded bg-[var(--line)] animate-pulse" />
          <div className="w-3/4 h-3 rounded bg-[var(--line)] animate-pulse" />
        </div>

        {/* Specs Badges */}
        <div className="flex flex-wrap gap-1.5 my-1">
          <div className="w-14 h-4 rounded bg-[var(--line)] animate-pulse" />
          <div className="w-16 h-4 rounded bg-[var(--line)] animate-pulse" />
          <div className="w-12 h-4 rounded bg-[var(--line)] animate-pulse" />
        </div>

        {/* Rating Placeholder */}
        <div className="flex items-center gap-1.5 my-1">
          <div className="w-3 h-3 rounded-full bg-[rgb(245 184 61 / 0.18)]" />
          <div className="w-8 h-2.5 rounded bg-[var(--line)]" />
          <div className="w-16 h-2 rounded bg-[var(--panel-2)]" />
        </div>

        {/* Price & Old Price */}
        <div className="flex items-baseline gap-2 mt-1">
          <div className="w-24 h-5 rounded bg-[var(--accent-soft)] animate-pulse" />
          <div className="w-14 h-3 rounded bg-[var(--line)]" />
        </div>

        {/* Footer: Stock & Add to Cart button */}
        <div className="pfoot flex justify-between items-center pt-2.5 mt-2 border-t border-[var(--line-strong)]">
          <div className="w-20 h-2.5 rounded bg-[rgb(62 207 142 / 0.15)] animate-pulse" />
          <Skeleton.Button
            active={active}
            size="small"
            style={{ width: 30, height: 28, borderRadius: 6 }}
          />
        </div>
      </div>
    </article>
  );
};

/**
 * ProductGridSkeleton
 * Renders multiple ProductCardSkeleton items inside the matching grid container.
 */
interface ProductGridSkeletonProps extends SkeletonProps {
  count?: number;
  columns?: 3 | 4;
}

export const ProductGridSkeleton: React.FC<ProductGridSkeletonProps> = ({
  count = 6,
  columns = 3,
  active = true,
  className = '',
}) => {
  const gridClass = columns === 3 ? 'products three' : 'products';

  return (
    <div className={`${gridClass} ${className}`} data-testid="product-grid-skeleton">
      {Array.from({ length: count }).map((_, index) => (
        <ProductCardSkeleton key={index} active={active} />
      ))}
    </div>
  );
};

/**
 * BuilderSlotSkeleton
 * Matches PC Builder slot items (01..08).
 */
export const BuilderSlotSkeleton: React.FC<{ index: number; active?: boolean }> = ({
  index,
  active = true,
}) => {
  return (
    <div className="slot flex items-center gap-3 p-3.5 rounded-[9px] border border-[var(--line-strong)] bg-[var(--panel)]">
      <b className="font-['Space_Grotesk'] text-[var(--accent)] text-sm opacity-60">
        {String(index + 1).padStart(2, '0')}
      </b>
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="w-28 h-3 rounded bg-[var(--line-strong)] animate-pulse" />
        <div className="w-44 h-2.5 rounded bg-[var(--line)]" />
      </div>
      <div className="w-16 h-3 rounded bg-[var(--accent-soft)] hidden sm:block" />
      <Skeleton.Button
        active={active}
        size="small"
        style={{ width: 92, height: 32, borderRadius: 6 }}
      />
    </div>
  );
};

/**
 * BuilderSkeleton
 * Full skeleton view for the PC Builder screen.
 */
export const BuilderSkeleton: React.FC<SkeletonProps> = ({ active = true }) => {
  return (
    <div className="builder grid grid-cols-1 md:grid-cols-[1fr_320px] gap-5 items-start" data-testid="builder-skeleton">
      {/* Left Slot list */}
      <div className="slotlist grid gap-2.5">
        {Array.from({ length: 8 }).map((_, i) => (
          <BuilderSlotSkeleton key={i} index={i} active={active} />
        ))}
      </div>

      {/* Right Summary Sidebar */}
      <aside className="summary p-4 rounded-[10px] border border-[var(--line-strong)] bg-[var(--panel)] space-y-3">
        <div className="w-20 h-2.5 rounded bg-[var(--accent-soft)]" />
        <div className="w-36 h-4 rounded bg-[var(--line-strong)]" />
        <div className="w-24 h-7 rounded bg-[var(--line-strong)] animate-pulse" />
        <div className="h-1.5 w-full bg-[var(--line-strong)] rounded-full overflow-hidden">
          <div className="w-1/4 h-full bg-[var(--accent-soft)]" />
        </div>

        <div className="space-y-2 py-2">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="flex justify-between items-center">
              <div className="w-16 h-2.5 rounded bg-[var(--line)]" />
              <div className="w-14 h-2.5 rounded bg-[var(--line)]" />
            </div>
          ))}
        </div>

        <div className="pt-3 border-t border-[var(--line-strong)] space-y-2">
          <div className="flex justify-between items-center">
            <div className="w-20 h-3 rounded bg-[var(--line)]" />
            <div className="w-28 h-6 rounded bg-[var(--accent-soft)] animate-pulse" />
          </div>
          <Skeleton.Button
            active={active}
            block
            size="large"
            style={{ height: 42, borderRadius: 8 }}
          />
        </div>
      </aside>
    </div>
  );
};

/**
 * PicklistSkeleton
 * Skeleton list items inside the Drawer when selecting a component for a slot.
 */
export const PicklistSkeleton: React.FC<{ count?: number; active?: boolean }> = ({
  count = 4,
  active = true,
}) => {
  return (
    <div className="picklist grid gap-2.5" data-testid="picklist-skeleton">
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="flex items-center gap-3 p-2.5 rounded-lg border border-[var(--line-strong)] bg-[var(--panel)]"
        >
          {/* Thumbnail */}
          <div className="w-[55px] h-[50px] rounded bg-[var(--panel-2)] flex-shrink-0 animate-pulse" />

          {/* Details */}
          <div className="flex-1 space-y-1.5 min-w-0">
            <div className="w-40 h-3 rounded bg-[var(--line)] animate-pulse" />
            <div className="w-28 h-2 rounded bg-[var(--line)]" />
            <div className="w-20 h-3 rounded bg-[var(--accent-soft)]" />
          </div>

          {/* Choose button */}
          <Skeleton.Button
            active={active}
            size="small"
            style={{ width: 56, height: 28, borderRadius: 6 }}
          />
        </div>
      ))}
    </div>
  );
};
