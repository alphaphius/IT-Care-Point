import { Link } from "react-router-dom";
import { Compass } from "@phosphor-icons/react";

export function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
        <Compass size={26} />
      </div>
      <h1 className="text-2xl font-semibold">ไม่พบหน้านี้</h1>
      <p className="text-sm text-zinc-500">ลิงก์อาจไม่ถูกต้อง หรือหน้านี้ถูกย้ายแล้ว</p>
      <Link to="/" className="mt-2 text-sm font-medium text-accent hover:underline">
        กลับหน้าแรก
      </Link>
    </div>
  );
}
