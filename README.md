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
**สถานะ: deploy แล้ว** ที่ Script ID `1VVuO53LPkJZoVH0vwieVYujnIWDv9Usj2GsVNp2wgT1FwDDNv3vUqJx4`

ใช้ **1 deployment** เท่านั้น (anonymous + user-deploying):
- **URL API** (Execute as: Me / Access: Anyone, even anonymous): `https://script.google.com/macros/s/AKfycbysjvfKAZ_y2wTzzZvAruN_4YMp95KIIF23KB9ESGKFRezug5mV5p-UAxm9IWza6UNJKw/exec`

ถ้าจะ deploy ใหม่ด้วยตัวเอง:
1. ติดตั้ง clasp: `npm i -g @google/clasp` แล้ว `clasp login`
2. `gas/appsscript.json` ใช้ `"executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS"` แล้ว `clasp push`
3. `clasp deploy` → copy URL ไปใส่ช่อง "URL API"
4. เปิด console ของ backend รัน `setupTriggers()` หนึ่งครั้ง เพื่อตั้ง SLA trigger รายชั่วโมง
5. แก้ URL ได้ที่หน้า Admin → ตั้งค่า → ข้อมูลแอป

> ครั้งแรกที่เข้าใช้งาน จะสร้าง sheet: Tickets, Messages, Assets, PM, Settings, Sessions, Users, Notifications ให้อัตโนมัติ
> ผู้ใช้คนแรกเมื่อยังไม่มี admin จะกลายเป็น admin คนแรก
> สมัครสมาชิก: email + รหัสผ่าน (hash ด้วย PBKDF2-SHA256 ที่ฝั่ง client ไม่ส่งรหัสผ่านจริงไปเซิร์ฟเวอร์)
> ต้องรัน `setupTriggers()` หนึ่งครั้ง (ผ่าน Apps Script editor) เพื่อให้ระบบเช็ค SLA รายชั่วโมง — รันไปแล้ว

## หมายเหตุ
- สิทธิ์แยก: User / Staff / Admin (ตั้ง email ในหน้า Admin Settings)
- SLA: critical 2h, high 8h, medium 24h, low 48h (ปรับได้)
- ไฟล์แนบถูกเก็บใน Drive folder "IT Care Point Attachments" (ใครที่มีลิงก์เข้าถึงได้)
