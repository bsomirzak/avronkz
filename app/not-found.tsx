import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="container" style={{ padding: "80px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 64, fontWeight: 800, marginBottom: 12 }}>404</h1>
        <p style={{ color: "var(--ink-soft)", marginBottom: 24 }}>
          Такой страницы не существует или товар снят с продажи.
        </p>
        <Link href="/" className="btn-primary">Вернуться в каталог</Link>
      </main>
      <Footer />
    </>
  );
}
