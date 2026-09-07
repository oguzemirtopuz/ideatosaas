// Idea-to-App Pipeline Kapsamlı Otomatik Test Paketi
// Bu dosya import temizleme, derleme güvenliği ve backend API entegrasyonlarını test eder.

import assert from 'assert';
import http from 'http';
import { sanitizeReactCode } from '../src/services/specBuilder.ts';
import app from '../src/app.ts';

console.log('========================================================');
console.log('🧪 IDEA-TO-APP PIPELINE TEST SUITE BAŞLATILIYOR');
console.log('========================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✅ [GEÇTİ] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ❌ [BAŞARISIZ] ${name}`);
    console.error(`     Hata Detayı: ${err.message}\n`);
    failedTests++;
  }
}

// -------------------------------------------------------------
// GRUP 1: IMPORT VE SÖZDİZİMİ TEMİZLEME (SANITIZE) TESTLERİ
// -------------------------------------------------------------
console.log('--- BÖLÜM 1: Import & Sanitize Güvenlik Testleri ---');

const importTestCases = [
  { name: '1. React default & named import', code: `import React, { useState, useEffect } from 'react';\nfunction App() { return 1; }` },
  { name: '2. React named import çift tırnak', code: `import { useState, useMemo } from "react";\nfunction App() { return 1; }` },
  { name: '3. React named noktalı virgülsüz', code: `import { useState } from 'react'\nfunction App() { return 1; }` },
  { name: '4. React default import', code: `import React from 'react';\nfunction App() { return 1; }` },
  { name: '5. React namespace import', code: `import * as React from 'react';\nfunction App() { return 1; }` },
  { name: '6. Bare react import', code: `import 'react';\nfunction App() { return 1; }` },
  { name: '7. Lucide named import', code: `import { Sparkles, Trash2, ArrowRight } from 'lucide-react';\nfunction App() { return 1; }` },
  { name: '8. Lucide default import', code: `import Lucide from 'lucide-react';\nfunction App() { return 1; }` },
  { name: '9. Lucide wildcard/namespace import', code: `import * as Icons from 'lucide-react';\nfunction App() { return 1; }` },
  { name: '10. React-icons import', code: `import { FaCheck, FaTimes } from 'react-icons/fa';\nfunction App() { return 1; }` },
  { name: '11. Heroicons import', code: `import { SunIcon } from '@heroicons/react/24/outline';\nfunction App() { return 1; }` },
  { name: '12. Üçüncü parti grafik kütüphanesi (Recharts)', code: `import { BarChart, Bar, XAxis, YAxis } from 'recharts';\nfunction App() { return 1; }` },
  { name: '13. Üçüncü parti animasyon (Framer Motion)', code: `import { motion, AnimatePresence } from 'framer-motion';\nfunction App() { return 1; }` },
  { name: '14. Supabase Client import', code: `import { createClient } from '@supabase/supabase-js';\nfunction App() { return 1; }` },
  { name: '15. Harici efekt paketi (Confetti)', code: `import confetti from 'canvas-confetti';\nfunction App() { return 1; }` },
  { name: '16. CSS dosya importu', code: `import './styles.css';\nfunction App() { return 1; }` },
  { name: '17. Global CSS importu çift tırnak', code: `import "@/styles/globals.css"\nfunction App() { return 1; }` },
  { name: '18. Tailwind paket importu', code: `import 'tailwindcss/tailwind.css';\nfunction App() { return 1; }` },
  { name: '19. Çok satırlı React importu', code: `import {\n  useState,\n  useEffect,\n  useCallback\n} from 'react';\nfunction App() { return 1; }` },
  { name: '20. Çok satırlı üçüncü parti import (noktalı virgülsüz)', code: `import {\n  BarChart,\n  LineChart\n} from 'recharts'\nfunction App() { return 1; }` },
  { name: '21. Tek satırda birden fazla import (minified)', code: `import React from 'react';import {useState} from 'react';function App() { return 1; }` },
  { name: '22. TypeScript type import', code: `import type { FC, ReactNode } from 'react';\nfunction App() { return 1; }` },
  { name: '23. Inline type import', code: `import { type User, useState } from 'react';\nfunction App() { return 1; }` },
  { name: '24. Dinamik import() çağrısı', code: `function App() { const load = () => import('./mod'); return 1; }` },
  { name: '25. Satır içi ve karışık boşluklu import', code: `import   React ,  {   useState   }   from   "react"  ;\nfunction App() { return 1; }` },
  { name: '26. Boşluksuz bitişik import', code: `import{useState}from'react';\nfunction App() { return 1; }` },
  { name: '27. Yorum satırı arkasındaki import', code: `// Eski import kodu\nimport { Check } from 'lucide-react';\nfunction App() { return 1; }` },
  { name: '28. Satır sonunda açıklama olan import', code: `import { useState } from 'react'; // state yonetimi\nfunction App() { return 1; }` },
  { name: '29. Export default function bileşeni', code: `export default function Dashboard() { return 1; }` },
  { name: '30. Export default tanımlanmış bileşen', code: `function MainApp() { return 1; }\nexport default MainApp;` },
  { name: '31. Named exportlar', code: `export const X = 10;\nexport function App() { return 1; }` },
  { name: '32. Bozuk React.createElement props (onClick()=>)', code: `function App() { return React.createElement('button', { onClick()=>setView('home') }, 'Click'); }` },
  { name: '33. Bozuk JSX parantezleri (onClick={() => ...})', code: `function App() { return React.createElement('button', { onClick={() => setView('home')} }, 'Click'); }` },
  { name: '34. Eksik kapatılmış süslü parantezler', code: `function App() { if (true) { return 1;` },
  { name: '35. Eksik kapatılmış normal parantezler', code: `function App() { console.log("test"; return 1; }` }
];

for (const tc of importTestCases) {
  runTest(tc.name, () => {
    const cleaned = sanitizeReactCode(tc.code);
    
    // 1. Canlı koda hiçbir 'import ' veya 'import{' veya 'import(' sızmamalı
    const containsImportStatement = /\bimport\s+[\s\S]*?from|\bimport\s*['"`]|\bimport\s*\(/.test(cleaned);
    assert.strictEqual(
      containsImportStatement,
      false,
      `Sanitize edilmiş kod hala canlı import ifadesi barındırıyor: ${cleaned.substring(0, 100)}`
    );

    // 2. JavaScript new Function içine girdiğinde "Cannot use import statement" hatası vermemeli
    try {
      new Function('React', cleaned);
    } catch (e) {
      if (e.message.includes('Cannot use import statement') || e.message.includes("Unexpected token 'import'")) {
        throw new Error(`Tarayıcı çalıştırma hatası saptandı: ${e.message}`);
      }
    }
  });
}

// -------------------------------------------------------------
// GRUP 2: BACKEND API ENDPOINT VE FALLBACK ENTEGRASYON TESTLERİ
// -------------------------------------------------------------
console.log('\n--- BÖLÜM 2: Backend API Uçları & Fallback Güvenlik Testleri ---');

async function testApiEndpoints() {
  const server = http.createServer(app);
  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // Test 2.1: /api/test sağlık kontrolü
    await new Promise((resolve) => {
      runTest('API: GET /api/test (Health Check)', async () => {
        const res = await fetch(`${baseUrl}/api/test`);
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.strictEqual(json.status, 'ok');
        resolve();
      });
    });

    // Test 2.2: /api/generate-ideas
    await new Promise((resolve) => {
      runTest('API: POST /api/generate-ideas (Fikir Üretici & Fallback)', async () => {
        const res = await fetch(`${baseUrl}/api/generate-ideas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customIdea: 'Kayıp hayvan takip platformu' })
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.ok(Array.isArray(json.ideas), 'ideas bir dizi olmalı');
        assert.ok(json.ideas.length >= 1, 'En az 1 fikir dönmeli');
        assert.ok(json.ideas[0].title, 'Fikir başlığı olmalı');
        assert.ok(json.ideas[0].problem, 'Fikir problemi olmalı');
        resolve();
      });
    });

    // Test 2.3: /api/generate-spec
    await new Promise((resolve) => {
      runTest('API: POST /api/generate-spec (Şartname Üretici & Fallback)', async () => {
        const testIdea = {
          title: 'PetTracker',
          problem: 'Evcil hayvan sahipleri aşı ve bakım tarihlerini unutuyor',
          targetUser: 'Evcil hayvan sahipleri',
          mvpScope: ['Aşı takip takvimi', 'Bildirim sistemi']
        };
        const res = await fetch(`${baseUrl}/api/generate-spec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: testIdea })
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.ok(json.spec, 'spec nesnesi dönmeli');
        assert.ok(Array.isArray(json.spec.userFlows), 'userFlows dizisi bulunmalı');
        assert.ok(Array.isArray(json.spec.screens), 'screens dizisi bulunmalı');
        resolve();
      });
    });

    // Test 2.4: /api/build-app
    await new Promise((resolve) => {
      runTest('API: POST /api/build-app (Canlı Kod İnşa & Fallback Starter)', async () => {
        const testIdea = { title: 'PetTracker', problem: 'Aşı takip problemi' };
        const testSpec = { title: 'PetTracker', screens: ['Ana Ekran'], userFlows: ['Akış 1'] };
        const res = await fetch(`${baseUrl}/api/build-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: testIdea, spec: testSpec })
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.ok(json.code, 'Çalışan kod dönmeli');
        assert.ok(json.code.includes('App'), 'Kod App bileşeni içermeli');
        assert.strictEqual(/\bimport\s+[\s\S]*?from/.test(json.code), false, 'Üretilen kodda import olmamalı');
        resolve();
      });
    });

    // Test 2.5: /api/modify-app (AI Chat)
    await new Promise((resolve) => {
      runTest('API: POST /api/modify-app (AI Sohbet Değişiklik Asistanı)', async () => {
        const currentCode = `function App() { return <div>Mevcut Uygulama</div>; }`;
        const res = await fetch(`${baseUrl}/api/modify-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentCode,
            userPrompt: 'Arka planı mavi yap',
            ideaTitle: 'PetTracker'
          })
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.ok(json.updatedCode, 'Güncellenmiş kod dönmeli');
        assert.strictEqual(/\bimport\s+[\s\S]*?from/.test(json.updatedCode), false, 'AI Chat kodunda import olmamalı');
        resolve();
      });
    });

    // Test 2.6: /api/generate-marketing-decision
    await new Promise((resolve) => {
      runTest('API: POST /api/generate-marketing-decision (Pazarlama ve CAC Karar Motoru)', async () => {
        const testIdea = { title: 'PetTracker', problem: 'Aşı takip', targetUser: 'Hayvanseverler' };
        const testSpec = { tagline: 'Pratik evcil hayvan takibi' };
        const res = await fetch(`${baseUrl}/api/generate-marketing-decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: testIdea, spec: testSpec })
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.ok(json.result, 'Pazarlama sonucu dönmeli');
        assert.ok(json.result.simulation, 'CAC simülasyonu bulunmalı');
        assert.ok(json.result.simulation.decision, 'Karar (DEVAM ET / DURDUR) bulunmalı');
        resolve();
      });
    });

  } finally {
    server.close();
  }

  // ÖZET RAPOR
  console.log('\n========================================================');
  console.log(`📊 TEST SONUÇLARI: ${passedTests} GEÇTİ, ${failedTests} BAŞARISIZ (Toplam: ${totalTests})`);
  console.log('========================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

testApiEndpoints().catch(err => {
  console.error('Test yürütme hatası:', err);
  process.exit(1);
});
