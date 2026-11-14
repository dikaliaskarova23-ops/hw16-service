import ExcelJS from "exceljs";
import {
  buildCalendar,
  KIND_LABELS,
  STATUS_LABELS,
  type Kind,
  type Operation,
  type OpStatus,
  type Period,
} from "@/lib/calendar";

const BRAND = "FF0F766E";
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND } };
const MONEY = '#,##0.00;[Red]-#,##0.00';

function styleHeader(row: ExcelJS.Row) {
  row.font = { bold: true, color: { argb: "FFFFFFFF" } };
  row.fill = HEADER_FILL;
  row.alignment = { vertical: "middle", wrapText: true };
  row.height = 22;
}

const toDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

// Готовый платёжный календарь. Суммы по дням — формулы СУММЕСЛИМН по листу «Операции»,
// поэтому если поправить операцию прямо в Excel, календарь пересчитается сам.
export async function buildCalendarWorkbook(period: Period, operations: Operation[]) {
  const cal = buildCalendar(period, operations);
  const ops = [...operations].sort((a, b) => a.op_date.localeCompare(b.op_date));

  const wb = new ExcelJS.Workbook();
  wb.creator = "Платёжный календарь";
  wb.created = new Date();

  const lastOp = Math.max(ops.length + 1, 2);

  // --- Лист «Календарь» ---
  const ws = wb.addWorksheet("Календарь", { views: [{ state: "frozen", ySplit: 4 }] });
  ws.columns = [
    { key: "date", width: 26 },
    { key: "opening", width: 18 },
    { key: "inflow", width: 18 },
    { key: "outflow", width: 18 },
    { key: "closing", width: 18 },
    { key: "details", width: 60 },
  ];
  ws.mergeCells("A1:F1");
  ws.getCell("A1").value = `Платёжный календарь: ${period.name}`;
  ws.getCell("A1").font = { bold: true, size: 14, color: { argb: BRAND } };
  ws.getCell("A2").value = "Остаток на начало периода:";
  ws.getCell("B2").value = Number(period.opening_balance);
  ws.getCell("B2").numFmt = MONEY;
  ws.getCell("C2").value = `Валюта: ${period.currency}`;
  ws.getRow(4).values = ["Дата", "Остаток на начало", "Поступления", "Платежи", "Остаток на конец", "Операции дня"];
  styleHeader(ws.getRow(4));

  const opsRange = (col: string) => `'Операции'!$${col}$2:$${col}$${lastOp}`;
  cal.days.forEach((d, i) => {
    const r = 5 + i;
    const row = ws.getRow(r);
    row.getCell(1).value = toDate(d.date);
    row.getCell(1).numFmt = "dd.mm.yyyy";
    row.getCell(2).value = { formula: i === 0 ? "$B$2" : `E${r - 1}`, result: d.opening };
    row.getCell(3).value = {
      formula: `SUMIFS(${opsRange("E")},${opsRange("A")},A${r},${opsRange("B")},"${KIND_LABELS.inflow}")`,
      result: d.inflow,
    };
    row.getCell(4).value = {
      formula: `SUMIFS(${opsRange("E")},${opsRange("A")},A${r},${opsRange("B")},"${KIND_LABELS.outflow}")`,
      result: d.outflow,
    };
    row.getCell(5).value = { formula: `B${r}+C${r}-D${r}`, result: d.closing };
    for (const c of [2, 3, 4, 5]) row.getCell(c).numFmt = MONEY;
    row.getCell(6).value = d.ops
      .map((o) => `${o.kind === "inflow" ? "+" : "−"}${Number(o.amount).toLocaleString("ru-RU")} ${o.category}${o.counterparty ? ` (${o.counterparty})` : ""}`)
      .join("; ");
    row.getCell(6).alignment = { wrapText: true, vertical: "top" };
    // выходные — серым
    if (new Date(`${d.date}T00:00:00Z`).getUTCDay() % 6 === 0) {
      row.getCell(1).font = { color: { argb: "FF9CA3AF" } };
    }
  });
  const last = 4 + cal.days.length;
  // Кассовый разрыв — красная заливка строки
  ws.addConditionalFormatting({
    ref: `A5:F${last}`,
    rules: [
      {
        type: "expression",
        priority: 1,
        formulae: [`$E5<0`],
        style: { fill: { type: "pattern", pattern: "solid", bgColor: { argb: "FFFEE2E2" } }, font: { color: { argb: "FFB91C1C" } } },
      },
    ],
  });
  const total = ws.getRow(last + 1);
  total.values = ["Итого", null, { formula: `SUM(C5:C${last})`, result: cal.totalIn }, { formula: `SUM(D5:D${last})`, result: cal.totalOut }, { formula: `E${last}`, result: cal.closing }];
  total.font = { bold: true };
  for (const c of [3, 4, 5]) total.getCell(c).numFmt = MONEY;
  total.border = { top: { style: "thin" } };

  // --- Лист «Операции» ---
  const wsOps = wb.addWorksheet("Операции", { views: [{ state: "frozen", ySplit: 1 }] });
  wsOps.columns = [
    { header: "Дата", key: "date", width: 12, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Тип", key: "kind", width: 14 },
    { header: "Статья", key: "category", width: 24 },
    { header: "Контрагент", key: "counterparty", width: 24 },
    { header: "Сумма", key: "amount", width: 16, style: { numFmt: MONEY } },
    { header: "Статус", key: "status", width: 10 },
    { header: "Комментарий", key: "notes", width: 32 },
  ];
  styleHeader(wsOps.getRow(1));
  for (const o of ops) {
    wsOps.addRow({
      date: toDate(o.op_date),
      kind: KIND_LABELS[o.kind],
      category: o.category,
      counterparty: o.counterparty ?? "",
      amount: Number(o.amount),
      status: STATUS_LABELS[o.status],
      notes: o.notes ?? "",
    });
  }
  wsOps.autoFilter = { from: "A1", to: `G${lastOp}` };

  // --- Лист «По статьям» ---
  const wsCat = wb.addWorksheet("По статьям");
  wsCat.columns = [
    { header: "Тип", key: "kind", width: 14 },
    { header: "Статья", key: "category", width: 28 },
    { header: "Сумма за период", key: "sum", width: 18, style: { numFmt: MONEY } },
  ];
  styleHeader(wsCat.getRow(1));
  const cats = new Map<string, { kind: Kind; category: string; sum: number }>();
  for (const o of ops) {
    const key = `${o.kind}|${o.category}`;
    const cur = cats.get(key) ?? { kind: o.kind, category: o.category, sum: 0 };
    cur.sum += Number(o.amount);
    cats.set(key, cur);
  }
  [...cats.values()]
    .sort((a, b) => a.kind.localeCompare(b.kind) || b.sum - a.sum)
    .forEach((c) => wsCat.addRow({ kind: KIND_LABELS[c.kind], category: c.category, sum: c.sum }));

  wb.views = [{ activeTab: 0, x: 0, y: 0, width: 10000, height: 20000, firstSheet: 0, visibility: "visible" }];

  return Buffer.from(await wb.xlsx.writeBuffer());
}

// Шаблон для загрузки: те же колонки, что на листе «Операции».
export async function buildTemplateWorkbook() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Операции");
  ws.columns = [
    { header: "Дата", key: "date", width: 12, style: { numFmt: "dd.mm.yyyy" } },
    { header: "Тип", key: "kind", width: 14 },
    { header: "Статья", key: "category", width: 24 },
    { header: "Контрагент", key: "counterparty", width: 24 },
    { header: "Сумма", key: "amount", width: 16, style: { numFmt: MONEY } },
    { header: "Статус", key: "status", width: 10 },
    { header: "Комментарий", key: "notes", width: 32 },
  ];
  styleHeader(ws.getRow(1));
  const today = new Date();
  const d = (plus: number) => new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() + plus));
  ws.addRow({ date: d(1), kind: "Поступление", category: "Оплата от клиента", counterparty: "ТОО Ромашка", amount: 450000, status: "План" });
  ws.addRow({ date: d(3), kind: "Платёж", category: "Аренда", counterparty: "Арендодатель", amount: 200000, status: "План" });
  ws.addRow({ date: d(5), kind: "Платёж", category: "Зарплата", counterparty: "", amount: 350000, status: "План", notes: "аванс" });
  for (let r = 2; r <= 200; r++) {
    ws.getCell(`B${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"Поступление,Платёж"'] };
    ws.getCell(`F${r}`).dataValidation = { type: "list", allowBlank: true, formulae: ['"План,Факт"'] };
  }
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export type ParsedOp = {
  op_date: string;
  kind: Kind;
  category: string;
  counterparty: string | null;
  amount: number;
  status: OpStatus;
  notes: string | null;
};

function cellText(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v && v.result != null) return cellText(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return String(v.text);
  }
  return String(v).trim();
}

function parseDate(v: ExcelJS.CellValue): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // серийный номер даты Excel
    return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10);
  }
  const s = cellText(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

function parseKind(s: string): Kind | null {
  const t = s.toLowerCase();
  if (t.startsWith("пост") || t.startsWith("приход") || t === "+" || t === "inflow") return "inflow";
  if (t.startsWith("плат") || t.startsWith("расход") || t === "-" || t === "outflow") return "outflow";
  return null;
}

function parseAmount(v: ExcelJS.CellValue): number {
  if (typeof v === "number") return v;
  const s = cellText(v).replace(/\s/g, "").replace(",", ".");
  return Number(s);
}

// Читает первый лист загруженного файла. Возвращает распознанные строки и ошибки по номерам строк.
export async function parseOperationsWorkbook(buffer: ArrayBuffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  const rows: ParsedOp[] = [];
  const errors: string[] = [];
  if (!ws) return { rows, errors: ["В файле нет листов"] };

  ws.eachRow((row, n) => {
    if (n === 1) return; // заголовок
    const values = [1, 2, 3, 4, 5, 6, 7].map((c) => row.getCell(c).value);
    if (values.every((v) => cellText(v) === "")) return;

    const op_date = parseDate(values[0]);
    const kind = parseKind(cellText(values[1]));
    const category = cellText(values[2]).slice(0, 80);
    const amount = parseAmount(values[4]);
    const statusText = cellText(values[5]).toLowerCase();

    if (!op_date) return void errors.push(`Строка ${n}: не распознана дата`);
    if (!kind) return void errors.push(`Строка ${n}: тип должен быть «Поступление» или «Платёж»`);
    if (!category) return void errors.push(`Строка ${n}: пустая статья`);
    if (!Number.isFinite(amount) || amount <= 0) return void errors.push(`Строка ${n}: сумма должна быть больше 0`);

    rows.push({
      op_date,
      kind,
      category,
      counterparty: cellText(values[3]).slice(0, 120) || null,
      amount: Math.round(Math.abs(amount) * 100) / 100,
      status: statusText.startsWith("факт") || statusText === "done" ? "done" : "planned",
      notes: cellText(values[6]) || null,
    });
  });

  return { rows, errors };
}
