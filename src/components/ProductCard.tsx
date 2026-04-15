import { Link } from "react-router-dom";
import type { Product } from "@/data/products";

type Props = {
  product: Product;
};

const ProductCard = ({ product }: Props) => {
  return (
    <Link
      to={`/${product.category}/${product.id}`}
      className="bg-chassis border border-border-subtle group flex flex-col hover:border-primary/40 transition-colors"
    >
      <div className="aspect-square bg-grip relative overflow-hidden">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 opacity-70"
        />
        <div className="absolute top-3 left-3">
          <span className="font-mono-tech text-[10px] bg-chassis/90 px-2 py-1 text-foreground tracking-widest">
            {product.tag}
          </span>
        </div>
        {!product.inStock && (
          <div className="absolute inset-0 bg-chassis/70 flex items-center justify-center">
            <span className="font-mono-tech text-[10px] text-muted-foreground tracking-widest uppercase border border-border-subtle px-3 py-1">
              Out of Stock
            </span>
          </div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-1">
        <span className="font-mono-tech text-[10px] text-muted-foreground tracking-widest uppercase mb-2">
          {product.brand}
        </span>
        <h3 className="text-sm font-bold leading-snug text-foreground group-hover:text-primary transition-colors mb-3 flex-1">
          {product.name}
        </h3>
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle mt-auto">
          <span className="text-primary font-mono-tech text-sm font-medium">
            ${product.price.toLocaleString()}
          </span>
          <span className="text-muted-foreground group-hover:text-primary transition-colors text-sm">
            →
          </span>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
