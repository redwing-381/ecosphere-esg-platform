import { useState } from "react";
import api, { apiError } from "../lib/api";
import { Button, Card, PageHeader } from "../components/ui";

/** Reports module: export the ESG summary as PDF or Excel. */
export default function Reports() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  async function download(path: string, filename: string) {
    setBusy(filename);
    setError("");
    try {
      const res = await api.get(path, { responseType: "blob" });
      const url = URL.createObjectURL(res.data as Blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Download the current ESG summary for sharing or audit." />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <p className="font-medium text-slate-800">ESG summary (PDF)</p>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            One-page overview with overall score and per-department breakdown.
          </p>
          <Button
            disabled={busy !== ""}
            onClick={() => download("/reports/esg.pdf", "ecosphere-esg.pdf")}
          >
            Download PDF
          </Button>
        </Card>
        <Card>
          <p className="font-medium text-slate-800">ESG data (Excel)</p>
          <p className="mb-4 mt-1 text-sm text-slate-500">
            Workbook with department scores and summary metrics.
          </p>
          <Button
            variant="ghost"
            disabled={busy !== ""}
            onClick={() => download("/reports/esg.xlsx", "ecosphere-esg.xlsx")}
          >
            Download Excel
          </Button>
        </Card>
      </div>
    </div>
  );
}
