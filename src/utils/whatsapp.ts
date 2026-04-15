import { Product } from "@/data/products";

const WA_NUMBER = "256792149296";

export function buildWhatsAppUrl(product: Product, includeSpecs = false): string {
  const imageUrl = `${window.location.origin}${product.image}`;

  const lines: string[] = [
    "Hi Davin's Camera Store! 👋",
    "I'd like to order the following:",
    "",
    `📦 Product: ${product.name}`,
    `💰 Price: UGX ${product.price.toLocaleString()}`,
    `🏷️ Brand: ${product.brand}`,
    `🔖 Category: ${product.category.charAt(0).toUpperCase() + product.category.slice(1)}`,
    `🖼️ Image: ${imageUrl}`,
  ];

  if (includeSpecs && product.specs.length > 0) {
    lines.push("");
    lines.push("📋 Specifications:");
    product.specs.forEach((spec) => {
      lines.push(`  - ${spec.label}: ${spec.value}`);
    });
  }

  lines.push("");
  lines.push("Please confirm availability and payment details. Thank you!");

  const message = encodeURIComponent(lines.join("\n"));
  return `https://wa.me/${WA_NUMBER}?text=${message}`;
}
