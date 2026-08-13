import type { Ticket } from "@/lib/types";

const FLOW = ["Received", "In Progress", "Pending Parts", "Resolved"] as const;

const FLOW_LABEL: Record<(typeof FLOW)[number], string> = {
  Received: "รับเรื่อง",
  "In Progress": "กำลังดำเนินการ",
  "Pending Parts": "รออะไหล่",
  Resolved: "เสร็จสิ้น",
};

function flowIndex(status: Ticket["status"]) {
  return FLOW.indexOf(status as (typeof FLOW)[number]);
}

export function TicketTimeline({ status }: { status: Ticket["status"] }) {
  const current = flowIndex(status);
  return (
    <div className="flex flex-col gap-3">
      {FLOW.map((s, i) => {
        const done = status === "Canceled" ? i === 0 : i <= current;
        const isCurrent = i === current && status !== "Canceled";
        return (
          <div key={s} className="flex items-center gap-3">
            <div className="flex flex-col items-center self-stretch">
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                  done
                    ? "border-accent bg-accent text-white"
                    : "border-zinc-300 bg-white text-zinc-400 dark:border-zinc-600 dark:bg-zinc-800"
                }`}
              >
                {i + 1}
              </span>
              {i < FLOW.length - 1 && (
                <span
                  className={`w-px flex-1 ${i < current ? "bg-accent/50" : "bg-zinc-200 dark:bg-zinc-700"}`}
                />
              )}
            </div>
            <span
              className={`text-sm ${
                isCurrent
                  ? "font-semibold text-accent"
                  : done
                    ? "text-zinc-700 dark:text-zinc-200"
                    : "text-zinc-400"
              }`}
            >
              {FLOW_LABEL[s]}
            </span>
          </div>
        );
      })}
    </div>
  );
}
