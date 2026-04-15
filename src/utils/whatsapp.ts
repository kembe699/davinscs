import { ApiProduct, api } from "@/lib/api";

const WA_NUMBER = "256792149296";

function buildMessage(product: ApiProduct, includeSpecs = false): string {
  const lines: string[] = [
    "Hi Davin's Camera Store! 👋",
    "I'd like to order the following:",
    "",
    `📦 Product: ${product.name}`,
    `💰 Price: UGX ${product.price.toLocaleString()}`,
    `🏷️ Brand: ${product.brand}`,
    `🔖 Category: ${product.category.charAt(0).toUpperCase() + product.category.slice(1)}`,
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
  return lines.join("\n");
}

export function buildWhatsAppUrl(product: ApiProduct, includeSpecs = false): string {
  const message = encodeURIComponent(buildMessage(product, includeSpecs));
  return `https://wa.me/${WA_NUMBER}?text=${message}`;
}

export function orderViaWhatsApp(product: ApiProduct, includeSpecs = false): void {
  api.orders.track(product.id, product.name).catch(() => {});
  window.open(buildWhatsAppUrl(product, includeSpecs), "_blank");
}
