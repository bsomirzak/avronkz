import { OrderForm } from "@/components/OrderForm";
import { formatPrice, type Product } from "@/lib/products";
import { SITE } from "@/lib/site";

/** Первое сообщение в WhatsApp: менеджер сразу видит товар, цену сайта и откуда человек. */
function whatsappOrderHref(product: Product, priceText: string) {
  // shortName («LT-75»), а не name: «Хочу заказать Интерактивная панель…» не склоняется.
  const text = `Здравствуйте! Хочу заказать ${SITE.name} ${product.shortName} за ${priceText}. ${SITE.url}/products/${product.id}`;
  return `${SITE.social.whatsapp}?text=${encodeURIComponent(text)}`;
}

/**
 * Кнопки заказа на карточке товара и на посадочной.
 * WhatsApp первым: форму заполнять лень, а написать в мессенджер — один тап.
 * Kaspi вторым — там цена выше (комиссия и рассрочка), поэтому он не главный.
 * Форма заявки осталась для тех, кто не пользуется WhatsApp.
 */
export function OrderCtas({ product }: { product: Product }) {
  const priceText =
    product.price !== null ? formatPrice(product.price) : (product.priceNote ?? "Цена по запросу");

  return (
    <>
      <a
        href={whatsappOrderHref(product, priceText)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-order-wa"
        data-analytics-value={product.price ?? undefined}
        data-analytics-product={product.id}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.47-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.05 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.21-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.41 9.41 0 0 1 2.77 6.7c0 5.23-4.25 9.46-9.47 9.46zm8.06-17.53A11.33 11.33 0 0 0 12.05.63C5.77.63.66 5.74.66 12.02c0 2.01.52 3.97 1.52 5.69L.57 23.6l6.04-1.58a11.36 11.36 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.05z" />
        </svg>
        Заказать в WhatsApp
      </a>
      <p className="cta-note">Цена {priceText} — при заказе напрямую у нас</p>
      <a
        href={product.kaspiUrl ?? SITE.social.kaspi}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-kaspi-buy secondary"
        data-analytics-value={product.price ?? undefined}
        data-analytics-product={product.id}
      >
        Купить на Kaspi.kz
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </a>
      <p className="cta-note">На Kaspi.kz — своя цена и условия рассрочки.</p>
      <OrderForm
        productId={product.id}
        productName={product.name}
        price={product.price}
        priceText={priceText}
        compact
      />
    </>
  );
}
