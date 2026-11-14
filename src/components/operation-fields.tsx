import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function OperationFields({
  min,
  max,
  initial,
}: {
  min: string;
  max: string;
  initial?: {
    op_date: string;
    kind: string;
    category: string;
    counterparty: string | null;
    amount: number | string;
    status: string;
    notes: string | null;
  };
}) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="kind">Тип</Label>
        <NativeSelect id="kind" name="kind" defaultValue={initial?.kind ?? "outflow"}>
          <option value="outflow">Платёж (расход)</option>
          <option value="inflow">Поступление (приход)</option>
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor="op_date">Дата</Label>
        <Input id="op_date" name="op_date" type="date" required min={min} max={max} defaultValue={initial?.op_date} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category">Статья</Label>
        <Input id="category" name="category" required maxLength={80} placeholder="Аренда, Зарплата, Оплата от клиента" defaultValue={initial?.category} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="counterparty">Контрагент</Label>
        <Input id="counterparty" name="counterparty" maxLength={120} placeholder="Кому / от кого" defaultValue={initial?.counterparty ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="amount">Сумма</Label>
        <Input id="amount" name="amount" inputMode="decimal" required placeholder="150000" defaultValue={initial?.amount ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="status">Статус</Label>
        <NativeSelect id="status" name="status" defaultValue={initial?.status ?? "planned"}>
          <option value="planned">План</option>
          <option value="done">Факт (уже прошло)</option>
        </NativeSelect>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="notes">Комментарий</Label>
        <Textarea id="notes" name="notes" defaultValue={initial?.notes ?? ""} />
      </div>
    </>
  );
}
