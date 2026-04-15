import { Link } from "react-router-dom";
import type { Product } from "@/data/products";
import { buildWhatsAppUrl } from "@/utils/whatsapp";

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
            UGX {product.price.toLocaleString()}
          </span>
          <a
            href={buildWhatsAppUrl(product)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Order via WhatsApp"
            className="flex items-center gap-1.5 bg-[#25D366] hover:bg-[#1ebe5d] text-white text-[10px] font-mono-tech uppercase tracking-widest px-2.5 py-1.5 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.852L.057 23.273a.75.75 0 0 0 .92.92l5.421-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.36l-.355-.212-3.676.997.977-3.567-.232-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
            Order
          </a>
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;
