import { useLayoutEffect, useRef, useState, type ComponentType } from 'react';

export interface TabItem<K extends string> {
  key: K;
  label: string;
  icon?: ComponentType<{ size?: number }>;
}

interface SegmentedTabsProps<K extends string> {
  tabs: readonly TabItem<K>[];
  value: K;
  onChange: (key: K) => void;
  size?: 'sm' | 'md' | 'lg'; // lg = tab utama (besar), sm = tab di dalam halaman (kecil, default)
}

// ukuran tiap varian (ditulis lengkap supaya terbaca Tailwind)
const SIZES = {
  sm: { tab: 'h-6 gap-1 px-2.5 text-xs', hover: 'h-6', list: 'gap-1 pb-1', icon: 12 },
  md: { tab: 'h-8 gap-1.5 px-3 text-[13px]', hover: 'h-8', list: 'gap-1.5 pb-1', icon: 14 },
  lg: { tab: 'h-10 gap-2 px-4 text-sm', hover: 'h-10', list: 'gap-2 pb-1.5', icon: 16 },
} as const;

// tab ala Vercel: sorotan abu mengikuti kursor, garis bawah meluncur ke tab aktif
export default function SegmentedTabs<K extends string>({ tabs, value, onChange, size = 'sm' }: SegmentedTabsProps<K>) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoverBox, setHoverBox] = useState({ left: 0, width: 0 });
  const [activeBox, setActiveBox] = useState({ left: 0, width: 0 });
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const S = SIZES[size];
  const activeIndex = Math.max(0, tabs.findIndex((t) => t.key === value));

  // posisi garis bawah mengikuti tab aktif (dan ukurannya kalau layar atau size berubah)
  useLayoutEffect(() => {
    const measure = () => {
      const el = tabRefs.current[activeIndex];
      if (el) setActiveBox({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (listRef.current) observer.observe(listRef.current);
    return () => observer.disconnect();
  }, [activeIndex, tabs, size]);

  return (
    <div className="overflow-x-auto">
      <div ref={listRef} role="tablist" className={`relative flex w-max items-center ${S.list}`}>
        {/* sorotan hover */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute top-0 ${S.hover} rounded-md bg-hover transition-all duration-300 ease-out`}
          style={{ ...hoverBox, opacity: hovered !== null ? 1 : 0 }}
        />
        {/* garis bawah tab aktif */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-0 h-0.5 bg-ink transition-all duration-300 ease-out"
          style={activeBox}
        />

        {tabs.map(({ key, label, icon: Icon }, index) => (
          <button
            key={key}
            ref={(el) => { tabRefs.current[index] = el; }}
            type="button"
            role="tab"
            aria-selected={key === value}
            onClick={() => onChange(key)}
            onMouseEnter={(e) => {
              setHovered(index);
              setHoverBox({ left: e.currentTarget.offsetLeft, width: e.currentTarget.offsetWidth });
            }}
            onMouseLeave={() => setHovered(null)}
            className={`relative z-10 flex ${S.tab} shrink-0 cursor-pointer items-center font-medium whitespace-nowrap transition-colors duration-300 ${
              key === value ? 'text-ink' : 'text-ink-muted'
            }`}
          >
            {Icon && <Icon size={S.icon} />}
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}