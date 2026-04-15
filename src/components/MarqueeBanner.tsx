const items = [
  "Free Shipping Over $500",
  "Authorized Dealer",
  "Expert Support",
  "Same-Day Shipping",
  "30-Day Returns",
  "Price Match Guarantee",
];

const MarqueeBanner = () => {
  return (
    <div className="w-full overflow-hidden bg-primary py-3 border-y border-border-subtle">
      <div className="flex whitespace-nowrap animate-marquee items-center">
        {[...items, ...items].map((item, i) => (
          <span
            key={i}
            className="text-primary-foreground font-bold text-[10px] tracking-[0.3em] uppercase mx-8"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
};

export default MarqueeBanner;
