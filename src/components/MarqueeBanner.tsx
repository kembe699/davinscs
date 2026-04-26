import { useLayout } from "@/contexts/LayoutContext";

const MarqueeBanner = () => {
  const { storefrontSettings: sf } = useLayout();

  const defaultItems = ["Free Shipping", "4.9/5 Rated", "Authorized Dealer"];
  const items = sf.ticker_items?.length ? sf.ticker_items : defaultItems;
  if (items.length === 0) return null;

  const bg = sf.ticker_bg || "#ffffff";
  const textColor = sf.ticker_text_color || "#000000";
  const displayed = [...items, ...items];

  return (
    <div className="w-full overflow-hidden py-3 border-y border-border-subtle" style={{ background: bg }}>
      <div className="flex whitespace-nowrap animate-marquee items-center">
        {displayed.map((item, i) => (
          <span
            key={i}
            className="font-bold text-[10px] tracking-[0.3em] uppercase mx-8"
            style={{ color: textColor }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBanner;
