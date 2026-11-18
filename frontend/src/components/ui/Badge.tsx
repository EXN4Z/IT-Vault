export default function Badge({ dot, children }: { dot: string; children: string }) {
  return (
    <span className="inline-flex h-5 items-center gap-1.5 rounded border border-line bg-hover/60 pl-1.5 pr-2 text-[11px] font-medium text-ink">
      <span className={`h-2.5 w-[3px] rounded-xs ${dot}`} />
      {children}
    </span>
  );
}