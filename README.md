# IT Care Point

ระบบแจ้งซ่อม IT แบบ SPA + PWA (ติดตั้งได้จากเบราว์เซอร์) ใช้ Google Sheets เป็นฐานข้อมูลผ่าน Google Apps Script

## Tech Stack
- React 19 + Vite 7 + TypeScript
- Tailwind CSS v4
- React Router v7, Motion, Phosphor Icons
- vite-plugin-pwa (offline + installable)
- Backend: Google Apps Script (ในโฟลเดอร์ `gas/`)

## โครงสร้างหลัก
```
src/
  pages/            หน้าต่างๆ (setup, login, user, staff, admin)
  components/       ui, layout, chat, notifications, ticket timeline
  lib/              types, api, config, session, format
gas/
  Code.gs           backend ทั้งหมด (auth, tickets, SLA, assets, PM, notifications)
```

## ติดตั้งและรัน

```bash
npm install --cache /tmp/npm-cache-itcp   # ถ้า ~/.npm มีปัญหา permission
npm run dev                                # dev server
npm run build                              # build ไปที่ dist/
npm run preview                            # ทดสอบ build
```

## Deploy ขึ้น GitHub Pages
1. สร้าง repo ชื่อ `IT-Care-Point` บน GitHub แล้ว push โค้ดนี้ขึ้น (branch `main`)
2. ไปที่ Settings → Pages → Source: **GitHub Actions**
3. push เพิ่มเมื่อไหร่ก็ auto-deploy ผ่าน `.github/workflows/deploy.yml`
4. เปิดเว็บ `<username>.github.io/IT-Care-Point/`

SPA deep-link รองรับแล้ว (มี `dist/404.html` ให้ GH Pages fallback ไปที่ app)

## ติดตั้ง Backend (Google Apps Script)
1. เปิด https://script.google.com → New Project → วางโค้ดจาก `gas/Code.gs` ทั้งหมด (ลบโค้ดเริ่มต้นทิ้ง)
2. ใน Apps Script editor เปิด Console (เพื่อตรวจ syntax ผ่าน)
3. Deploy → New deployment → Web app
   - Execute as: **User accessing the web app** (สำคัญมาก — ต้องเป็นแบบนี้ทุกครั้ง เพื่อให้ระบุตัวผู้ใช้แต่ละคนได้)
   - Who has access: **Anyone with Google account**
4. เปิด console ของ backend รัน `setupTriggers()` หนึ่งครั้ง เพื่อตั้ง SLA trigger รายชั่วโมง
5. copy URL ที่ลงท้าย `/exec` ไปใส่ในหน้าตั้งค่าแอป (หน้าแรกของเว็บ)
6. พิมพ์ GAS Script ID ที่ URL ของโปรเจกต์ (ส่วน `script.google.com/macros/s/<SCRIPT_ID>/...`) ลงในช่อง Script ID ด้วย

> ครั้งแรกที่เข้าใช้งาน จะสร้าง sheet: Tickets, Messages, Assets, PM, Settings, Sessions, Notifications ให้อัตโนมัติ
> ผู้ใช้คนแรกเมื่อยังไม่มี admin จะกลายเป็น admin คนแรก

## หมายเหตุ
- สิทธิ์แยก: User / Staff / Admin (ตั้ง email ในหน้า Admin Settings)
- SLA: critical 2h, high 8h, medium 24h, low 48h (ปรับได้)
- ไฟล์แนบถูกเก็บใน Drive folder "IT Care Point Attachments" (ใครที่มีลิงก์เข้าถึงได้)
