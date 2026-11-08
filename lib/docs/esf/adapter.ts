/**
 * Точка расширения для отправки ЭСФ через API ИС ЭСФ (SOAP + ЭЦП). Сейчас
 * не реализована: XML скачивается и импортируется в веб-интерфейсе вручную,
 * подпись — там же. Чтобы добавить отправку, реализуйте EsfSender (сессия
 * через SessionService, подпись NCALayer/ЭЦП, InvoiceService.syncInvoice)
 * и верните его из getSender().
 */

export type SendResult = { ok: true; registrationNumber: string } | { ok: false; error: string };

export interface EsfSender {
  readonly name: string;
  send(invoiceXml: string): Promise<SendResult>;
}

class ManualImport implements EsfSender {
  readonly name = "manual";
  async send(): Promise<SendResult> {
    return { ok: false, error: "Отправка через API не подключена — скачайте XML и импортируйте его в ИС ЭСФ" };
  }
}

export function getSender(): EsfSender {
  return new ManualImport();
}
