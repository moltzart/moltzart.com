import { fetchDrafts } from "@/lib/github";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminDrafts() {
  const { days } = await fetchDrafts();

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-semibold tracking-tight mb-6">Drafts</h1>

      {days.length === 0 ? (
        <p className="text-sm text-zinc-500">No drafts yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Pending</TableHead>
              <TableHead className="text-right">Approved</TableHead>
              <TableHead className="text-right">Posted</TableHead>
              <TableHead className="text-right">Rejected</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((day) => {
              const pending = day.drafts.filter((d) => d.status === "pending").length;
              const approved = day.drafts.filter((d) => d.status === "approved").length;
              const posted = day.drafts.filter((d) => d.status === "posted").length;
              const rejected = day.drafts.filter((d) => d.status === "rejected").length;

              return (
                <TableRow key={day.date}>
                  <TableCell>
                    <Link
                      href={`/admin/drafts/${day.date}`}
                      className="text-zinc-200 hover:text-white hover:underline font-medium"
                    >
                      {day.label}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right">
                    {pending > 0 ? (
                      <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10">
                        {pending}
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {approved > 0 ? (
                      <span className="text-green-400">{approved}</span>
                    ) : (
                      <span className="text-zinc-600">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {posted > 0 ? (
                      <span className="text-blue-400">{posted}</span>
                    ) : (
                      <span className="text-zinc-600">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {rejected > 0 ? (
                      <span className="text-zinc-500">{rejected}</span>
                    ) : (
                      <span className="text-zinc-600">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-zinc-400">
                    {day.drafts.length}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
