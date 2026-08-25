import { GADS_ID, YM_ID } from "@/lib/analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/next";
import { AnalyticsTrackers } from "./AnalyticsTrackers";

/**
 * Сниппеты Метрики и Google tag отдаются прямо в HTML (а не через next/script)
 * намеренно: очереди window.ym и window.dataLayer должны существовать до
 * гидрации, иначе события со страниц (view_product, view_contacts) улетают
 * в пустоту раньше, чем загрузятся счётчики.
 */
const ymSnippet = (id: number) => `(function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
m[i].l=1*new Date();
for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
(window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
ym(${id}, "init", {clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true});`;

const gtagSnippet = (id: string) => `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', '${id}');`;

export function Analytics() {
  const ymId = YM_ID ? Number(YM_ID) : null;
  return (
    <>
      <VercelAnalytics />
      <AnalyticsTrackers />
      {GADS_ID ? (
        <>
          <script async src={`https://www.googletagmanager.com/gtag/js?id=${GADS_ID}`} />
          <script dangerouslySetInnerHTML={{ __html: gtagSnippet(GADS_ID) }} />
        </>
      ) : null}
      {ymId ? (
        <>
          <script dangerouslySetInnerHTML={{ __html: ymSnippet(ymId) }} />
          <noscript>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element -- пиксель Метрики для браузеров без JS */}
              <img
                src={`https://mc.yandex.ru/watch/${ymId}`}
                style={{ position: "absolute", left: "-9999px" }}
                alt=""
              />
            </div>
          </noscript>
        </>
      ) : null}
    </>
  );
}
