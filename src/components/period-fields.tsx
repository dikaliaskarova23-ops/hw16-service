import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

export function PeriodFields({
  initial,
}: {
  initial?: { name: string; starts_on: string; ends_on: string; opening_balance: number | string; currency: string };
}) {
  return (
    <>
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="name">Название</Label>
        <Input id="name" name="name" required maxLength={80} placeholder="Декабрь 2026" defaultValue={initial?.name} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="starts_on">Начало</Label>
        <Input id="starts_on" name="starts_on" type="date" required defaultValue={initial?.starts_on} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="ends_on">Конец</Label>
        <Input id="ends_on" name="ends_on" type="date" required defaultValue={initial?.ends_on} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="opening_balance">Остаток денег на начало</Label>
        <Input id="opening_balance" name="opening_balance" inputMode="decimal" required placeholder="500000" defaultValue={initial?.opening_balance ?? ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="currency">Валюта</Label>
        <NativeSelect id="currency" name="currency" defaultValue={initial?.currency ?? "KZT"}>
          <option value="KZT">₸ KZT</option>
          <option value="RUB">₽ RUB</option>
          <option value="USD">$ USD</option>
          <option value="EUR">€ EUR</option>
        </NativeSelect>
      </div>
    </>
  );
}
