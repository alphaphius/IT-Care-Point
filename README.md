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
npm run test:gas                           # ทดสอบ logic ของ backend (mock จำลอง GAS)
```

## Deploy ขึ้น GitHub Pages
1. สร้าง repo ชื่อ `IT-Care-Point` บน GitHub แล้ว push โค้ดนี้ขึ้น (branch `main`)
2. ไปที่ Settings → Pages → Source: **GitHub Actions**
3. push เพิ่มเมื่อไหร่ก็ auto-deploy ผ่าน `.github/workflows/deploy.yml`
4. เปิดเว็บ `<username>.github.io/IT-Care-Point/`

SPA deep-link รองรับแล้ว (มี `dist/404.html` ให้ GH Pages fallback ไปที่ app)

## ติดตั้ง Backend (Google Apps Script)
**สถานะ: deploy แล้วแล้ว** ที่ Script ID `1VVuO53LPkJZoVH0vwieVYujnIWDv9Usj2GsVNp2wgT1FwDDNv3vUqJx4`

- Web app URL (ใช้ลงในหน้า Setup): `https://script.google.com/macros/s/AKfycbzixqTu8NwASw3hl6f_4iKW0EIDpz7KUvenyHE4nXjeItqXGaJkSDtbmjbEjLmC1DX1Pg/exec`
- Execute as: **User accessing the web app** / Access: **Anyone with Google account**

ถ้าจะ deploy ใหม่ด้วยตัวเอง:
1. ติดตั้ง clasp: `npm i -g @google/clasp` แล้ว `clasp login`
2. ในโฟลเดอร์ `gas/`: `clasp push -f` แล้ว `clasp deploy -d "..."` (สร้าง version ใหม่)
3. เปิด console ของ backend รัน `setupTriggers()` หนึ่งครั้ง เพื่อตั้ง SLA trigger รายชั่วโมง
4. copy URL ที่ลงท้าย `/exec` ไปใส่ในหน้าตั้งค่าแอป (หน้าแรกของเว็บ)

> ครั้งแรกที่เข้าใช้งาน จะสร้าง sheet: Tickets, Messages, Assets, PM, Settings, Sessions, Notifications ให้อัตโนมัติ
> ผู้ใช้คนแรกเมื่อยังไม่มี admin จะกลายเป็น admin คนแรก
> ผู้ใช้คนแรกต้องรัน `setupTriggers()` ก่อน ไม่งั้นระบบจะยังไม่เช็ค SLA อัตโนมัติ

## หมายเหตุ
- สิทธิ์แยก: User / Staff / Admin (ตั้ง email ในหน้า Admin Settings)
- SLA: critical 2h, high 8h, medium 24h, low 48h (ปรับได้)
- ไฟล์แนบถูกเก็บใน Drive folder "IT Care Point Attachments" (ใครที่มีลิงก์เข้าถึงได้)
