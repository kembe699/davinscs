import { ApiProduct, api } from "@/lib/api";

type WhatsAppOrderOptions = {
  whatsapp?: string | null;
  companyName?: string | null;
  currencySymbol?: string | null;
};

function sanitizeWhatsAppNumber(raw?: string | null): string {
  if (!raw) return "";
  return String(raw).replace(/\D/g, "");
}

function buildMessage(product: ApiProduct, opts: WhatsAppOrderOptions, includeSpecs = false): string {
  const companyName = opts.companyName?.trim() || "Hello";
  const sym = opts.currencySymbol?.trim() || "";

  const lines: string[] = [
    `Hello ${companyName},`,
    "I would like to place an order:",
    "",
    `Product: ${product.name}`,
    `Price: ${sym ? sym + " " : ""}${product.price.toLocaleString()}`,
    `Brand: ${product.brand}`,
    `Category: ${product.category.charAt(0).toUpperCase() + product.category.slice(1)}`,
  ];

  if (includeSpecs && product.specs.length > 0) {
    lines.push("");
    lines.push("Specifications:");
    product.specs.forEach((spec) => {
      lines.push(`- ${spec.label}: ${spec.value}`);
    });
  }

  lines.push("");
  lines.push("Please confirm availability and payment details.");
  return lines.join("\n");
}

export function buildWhatsAppUrl(product: ApiProduct, opts: WhatsAppOrderOptions, includeSpecs = false): string {
  const waNumber = sanitizeWhatsAppNumber(opts.whatsapp);
  const message = encodeURIComponent(buildMessage(product, opts, includeSpecs));
  return `https://wa.me/${waNumber}?text=${message}`;
}

export function orderViaWhatsApp(product: ApiProduct, opts: WhatsAppOrderOptions = {}, includeSpecs = false): void {
  const waNumber = sanitizeWhatsAppNumber(opts.whatsapp);
  if (!waNumber) return;
  api.orders.track(product.id, product.name).catch(() => {});
  window.open(buildWhatsAppUrl(product, opts, includeSpecs), "_blank");
}
