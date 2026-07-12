import { Card } from "../components/ui";

/** Temporary page shown for modules still under construction. */
export default function Placeholder({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
      <Card>
        <p className="text-sm text-slate-500">This module is being built.</p>
      </Card>
    </div>
  );
}
