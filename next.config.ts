import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Старые адреса товаров из первой версии сайта: Google знает их с июня и
  // отдаёт 404. Ведём на нынешний товар, а где товара больше нет — в категорию.
  async redirects() {
    return [
      { source: "/products/carplay", destination: "/products/baidu-carlife-carplay", permanent: true },
      { source: "/products/smartdisplay", destination: "/products/avron-panel-32", permanent: true },
      { source: "/products/ereader", destination: "/products/ebook-light", permanent: true },
      { source: "/products/massager", destination: "/catalog/massazhery", permanent: true },
      { source: "/products/printer3d", destination: "/catalog/printery-i-markiratory", permanent: true },
      { source: "/products/minipc", destination: "/#catalog", permanent: true },
    ];
  },
};

export default nextConfig;
