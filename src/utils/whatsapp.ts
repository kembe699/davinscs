import { Product } from "@/data/products";

const WA_NUMBER = "256792149296";

function buildMessage(product: Product, includeSpecs = false): string {
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

export function buildWhatsAppUrl(product: Product, includeSpecs = false): string {
  const message = encodeURIComponent(buildMessage(product, includeSpecs));
  return `https://wa.me/${WA_NUMBER}?text=${message}`;
}

export async function orderViaWhatsApp(product: Product, includeSpecs = false): Promise<void> {
  const text = buildMessage(product, includeSpecs);

  try {
    const imageUrl = `${window.location.origin}${product.image}`;
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const ext = blob.type.includes("png") ? "png" : "jpg";
    const file = new File([blob], `${product.id}.${ext}`, { type: blob.type });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text });
      return;
    }
  } catch {
    // fall through to wa.me
  }

  window.open(buildWhatsAppUrl(product, includeSpecs), "_blank");
}
