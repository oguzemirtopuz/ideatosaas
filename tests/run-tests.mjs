// Idea-to-App Pipeline Kapsamlı Otomatik Test Paketi
// Bu dosya import temizleme, derleme güvenliği ve backend API entegrasyonlarını test eder.

import assert from 'assert';
import http from 'http';
import JSZip from 'jszip';
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

    // Test 2.7: /api/generate-spec Eksik Parametre Doğrulaması (400)
    await new Promise((resolve) => {
      runTest('API: POST /api/generate-spec (Eksik parametrede 400 hatası)', async () => {
        const res = await fetch(`${baseUrl}/api/generate-spec`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        assert.strictEqual(res.status, 400);
        resolve();
      });
    });

    // Test 2.8: /api/build-app Eksik Parametre Doğrulaması (400)
    await new Promise((resolve) => {
      runTest('API: POST /api/build-app (Eksik parametrede 400 hatası)', async () => {
        const res = await fetch(`${baseUrl}/api/build-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idea: { title: 'Test' } }) // spec eksik
        });
        assert.strictEqual(res.status, 400);
        resolve();
      });
    });

    // Test 2.9: /api/modify-app Eksik Parametre Doğrulaması (400)
    await new Promise((resolve) => {
      runTest('API: POST /api/modify-app (Eksik parametrede 400 hatası)', async () => {
        const res = await fetch(`${baseUrl}/api/modify-app`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentCode: 'function App() {}' }) // userPrompt eksik
        });
        assert.strictEqual(res.status, 400);
        resolve();
      });
    });

    // Test 2.10: /api/generate-marketing-decision Eksik Parametre (400)
    await new Promise((resolve) => {
      runTest('API: POST /api/generate-marketing-decision (Eksik parametrede 400 hatası)', async () => {
        const res = await fetch(`${baseUrl}/api/generate-marketing-decision`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        });
        assert.strictEqual(res.status, 400);
        resolve();
      });
    });

    // Test 2.11: x-groq-api-key başlığı desteği
    await new Promise((resolve) => {
      runTest('API: Özel x-groq-api-key başlığı ile istek alma', async () => {
        const res = await fetch(`${baseUrl}/api/generate-ideas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-groq-api-key': 'gsk_dummy_test_key_12345'
          },
          body: JSON.stringify({ customIdea: 'Mikro rezervasyon SaaS' })
        });
        const json = await res.json();
        assert.strictEqual(res.status, 200);
        assert.ok(json.ideas && json.ideas.length >= 1, 'Özel anahtar ile fikir üretimi veya fallback dönmeli');
        resolve();
      });
    });

  } finally {
    server.close();
  }

  // -------------------------------------------------------------
  // GRUP 3: CANLI UYGULAMA (SANDBOX) & BABEL DERLEME TESTLERİ
  // -------------------------------------------------------------
  console.log('\n--- BÖLÜM 3: Canlı Uygulama (Sandbox) & Babel Güvenlik Testleri ---');
  
  const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.26.9/babel.min.js');
  const babelJs = await res.text();
  const vm = await import('vm');
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(babelJs, sandbox);

  // Test 3.1: Classic runtime importsuz JSX
  await new Promise((resolve) => {
    runTest('Sandbox: Classic runtime konfigürasyonu import { jsx } sızıntısını engeller', () => {
      const testJsx = 'function App() { return <div className="bg-red-500"><span>Test</span></div>; }';
      const transformed = sandbox.Babel.transform(testJsx, {
        filename: 'app.tsx',
        presets: ['typescript', ['react', { runtime: 'classic' }]]
      }).code;

      assert.strictEqual(/\bimport\b/.test(transformed), false, 'Classic runtime import içermemeli!');
      assert.ok(transformed.includes('React.createElement'), 'React.createElement çağrısı üretilmeli');
      resolve();
    });
  });

  // Test 3.2: TypeScript interface ve generics içeren kodun derlenmesi
  await new Promise((resolve) => {
    runTest('Sandbox: TypeScript interface ve generics içeren AI kodu hatasız derlenir', () => {
      const tsCode = `
        interface TodoItem {
          id: number;
          text: string;
          done: boolean;
        }
        function App() {
          const [todos, setTodos] = useState<TodoItem[]>([]);
          const handleAdd = (e: React.FormEvent) => { e.preventDefault(); };
          return <div>{todos.length}</div>;
        }
      `;
      const transformed = sandbox.Babel.transform(tsCode, {
        filename: 'app.tsx',
        presets: ['typescript', ['react', { runtime: 'classic' }]]
      }).code;

      assert.ok(transformed.includes('function App'), 'App fonksiyonu derlenmiş olmalı');
      assert.strictEqual(transformed.includes('interface TodoItem'), false, 'TypeScript interface kodu kaldırılmış olmalı');
      resolve();
    });
  });

  // Test 3.3: Mükerrer useState ve hook tanımlarının çakışmaması
  await new Promise((resolve) => {
    runTest('Sandbox: Mükerrer const { useState } tanımları Identifier already declared hatası vermez', () => {
      let rawCode = `
        const { useState, useEffect } = React;
        function App() {
          const [count, setCount] = useState(0);
          return <button onClick={() => setCount(count + 1)}>{count}</button>;
        }
      `;
      // App.tsx'teki temizleyiciyi uygulayalım
      rawCode = rawCode.replace(/(?:const|let|var)\s*\{[^}]*\}\s*=\s*React;?/g, '/* React hooks global */');

      const codeToTransform = [
        "var useState = React.useState, useEffect = React.useEffect;",
        rawCode,
        "var _candidate = null;",
        "if (typeof App !== 'undefined') { _candidate = App; }",
        "window.__CurrentApp = _candidate;"
      ].join('\n');

      const transformed = sandbox.Babel.transform(codeToTransform, {
        filename: 'app.tsx',
        presets: ['typescript', ['react', { runtime: 'classic' }]]
      }).code;

      const mockReact = {
        useState: (init) => [init, () => {}],
        useEffect: () => {},
        createElement: (type, props, ...children) => ({ type, props, children })
      };
      const testWindow = { React: mockReact };

      const fn = new Function('React', 'window', transformed);
      fn(mockReact, testWindow);
      assert.ok(typeof testWindow.__CurrentApp === 'function', 'App bileşeni başarıyla tanımlandı');
      resolve();
    });
  });

  // Test 3.4: İthal edilmemiş Lucide ikonlarının otomatik fallback ile çökmemesi
  await new Promise((resolve) => {
    runTest('Sandbox: Kodda ithal edilmemiş ikonlar (Check, Trash2, Sparkles) ReferenceError vermez', () => {
      const codeWithIcons = `
        function App() {
          return (
            <div>
              <Sparkles className="w-4 h-4" />
              <Check className="w-5 h-5" />
              <Trash2 className="w-4 h-4" />
            </div>
          );
        }
      `;

      const detectedIcons = Array.from(new Set(codeWithIcons.match(/<([A-Z][a-zA-Z0-9_]*)/g) || []))
        .map(t => t.slice(1))
        .filter(t => !['App', 'Main', 'React', 'Fragment', 'ErrorBoundary'].includes(t));

      const iconDeclarations = detectedIcons.map(name => {
        return `if (typeof ${name} === 'undefined') { var ${name} = window.LucideIcons['${name}']; }`;
      }).join('\n');

      const codeToTransform = [
        iconDeclarations,
        codeWithIcons,
        "window.__CurrentApp = App;"
      ].join('\n');

      const transformed = sandbox.Babel.transform(codeToTransform, {
        filename: 'app.tsx',
        presets: ['typescript', ['react', { runtime: 'classic' }]]
      }).code;

      const mockReact = {
        createElement: (type, props, ...children) => {
          if (typeof type === 'function') {
            return type(props);
          }
          return { type, props, children };
        }
      };

      const testWindow = {
        React: mockReact,
        LucideIcons: new Proxy({}, {
          get: (target, prop) => (props) => ({ type: 'span', icon: prop })
        })
      };

      const fn = new Function('React', 'window', transformed);
      fn(mockReact, testWindow);
      assert.ok(typeof testWindow.__CurrentApp === 'function', 'App bileşeni hatasız ayağa kalktı');
      resolve();
    });
  });

  // Test 3.5: Yerel vendor dosyalarının varlığı ve bütünlüğü
  await new Promise((resolve) => {
    runTest('Sandbox: Yerel vendor dosyaları (React, ReactDOM, Babel) eksiksiz mevcut', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const vendorDir = path.join(process.cwd(), 'public', 'vendor');
      
      const reactPath = path.join(vendorDir, 'react.production.min.js');
      const reactDomPath = path.join(vendorDir, 'react-dom.production.min.js');
      const babelPath = path.join(vendorDir, 'babel.min.js');

      assert.ok(fs.existsSync(reactPath), 'react.production.min.js mevcut olmalı');
      assert.ok(fs.existsSync(reactDomPath), 'react-dom.production.min.js mevcut olmalı');
      assert.ok(fs.existsSync(babelPath), 'babel.min.js mevcut olmalı');

      assert.ok(fs.statSync(reactPath).size > 5000, 'React dosyası geçerli boyutta olmalı');
      assert.ok(fs.statSync(reactDomPath).size > 50000, 'ReactDOM dosyası geçerli boyutta olmalı');
      assert.ok(fs.statSync(babelPath).size > 1000000, 'Babel dosyası geçerli boyutta olmalı');
      resolve();
    });
  });

  // Test 3.6: App.tsx içindeki getPreviewHtml mimari zırhı
  await new Promise((resolve) => {
    runTest('Sandbox: getPreviewHtml yerel vendor, CDN fallback ve erken hata yakalayıcı barındırır', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const appTsx = fs.readFileSync(path.join(process.cwd(), 'src', 'App.tsx'), 'utf-8');

      assert.ok(appTsx.includes('/vendor/react.production.min.js'), 'Yerel React vendor yolu bulunmalı');
      assert.ok(appTsx.includes('/vendor/react-dom.production.min.js'), 'Yerel ReactDOM vendor yolu bulunmalı');
      assert.ok(appTsx.includes('/vendor/babel.min.js'), 'Yerel Babel vendor yolu bulunmalı');
      assert.ok(appTsx.includes('loadScriptSequential'), 'Dayanıklı sıralı yükleyici bulunmalı');
      assert.ok(appTsx.includes('window.__step'), 'Kullanıcı adım durum bildirimleri bulunmalı');
      assert.ok(appTsx.includes('window.onerror'), 'Erken hata yakalayıcı bulunmalı');
      resolve();
    });
  });

  // -------------------------------------------------------------
  // GRUP 4: ZIP PAKETLEME VE DOSYA DIŞA AKTARMA TESTLERİ
  // -------------------------------------------------------------
  console.log('\n--- BÖLÜM 4: ZIP Paketleme ve Export Testleri ---');

  await new Promise((resolve) => {
    runTest('Export: JSZip ile tam proje paketi (SPEC.md, index.html, App.jsx, README.md) üretimi', async () => {
      const zip = new JSZip();
      const testSpec = {
        title: 'Test Micro SaaS',
        tagline: 'Otomatik test çözümü',
        userFlows: ['Akış 1', 'Akış 2'],
        dataModel: [{ table: 'users', description: 'Kullanıcılar' }],
        screens: ['Ana Panel'],
        outOfScope: ['Özel API']
      };
      const testCode = `function App() { return <div>Canlı Test Uygulaması</div>; }`;

      const specMd = `# ${testSpec.title}\n\n> ${testSpec.tagline}`;
      zip.file("SPEC.md", specMd);
      zip.file("index.html", "<!DOCTYPE html><html><body>Test</body></html>");
      zip.file("App.jsx", testCode);
      zip.file("README.md", `# ${testSpec.title}\n\nNasıl çalıştırılır?`);

      const content = await zip.generateAsync({ type: "nodebuffer" });
      assert.ok(content.length > 100, 'Geçerli ZIP arşivi üretildi');
      
      // ZIP içeriğini doğrula
      const unzipped = await JSZip.loadAsync(content);
      assert.ok(unzipped.file("SPEC.md"), 'SPEC.md zip içinde var');
      assert.ok(unzipped.file("index.html"), 'index.html zip içinde var');
      assert.ok(unzipped.file("App.jsx"), 'App.jsx zip içinde var');
      assert.ok(unzipped.file("README.md"), 'README.md zip içinde var');
      resolve();
    });
  });

  // -------------------------------------------------------------
  // GRUP 5: PROJE GEÇMİŞİ VE VERİ YAPISI TESTLERİ
  // -------------------------------------------------------------
  console.log('\n--- BÖLÜM 5: Proje Kaydetme & Veri Bütünlüğü Testleri ---');

  await new Promise((resolve) => {
    runTest('Data: SavedProject veri yapısı ve geri yükleme bütünlüğü', () => {
      const project = {
        id: 'proj-12345',
        createdAt: new Date().toISOString(),
        idea: {
          title: 'Test SaaS',
          problem: 'Problem açıklaması',
          targetUser: 'Geliştiriciler',
          alternatives: 'Alternatif yok',
          whyNow: 'Hemen şimdi',
          mvpScope: ['MVP 1'],
          feasibilityNote: '1 günde çıkar',
          scores: { pain: 8, lackOfSolutions: 7, feasibility: 9, monetization: 8 },
          totalScore: 32
        },
        spec: {
          title: 'Test SaaS',
          tagline: 'Hızlı çözüm',
          userFlows: ['Adım 1'],
          dataModel: [{ table: 'tasks', description: 'Görevler' }],
          screens: ['Panel'],
          outOfScope: ['Yok'],
          buildChecklist: ['Kurulum']
        },
        code: 'function App() { return <div>Test</div>; }',
        chatHistory: [
          { sender: 'user', text: 'Buton ekle', timestamp: '14:00' },
          { sender: 'ai', text: 'Eklendi', timestamp: '14:01' }
        ]
      };

      const serialized = JSON.stringify([project]);
      const deserialized = JSON.parse(serialized);

      assert.strictEqual(deserialized.length, 1);
      assert.strictEqual(deserialized[0].id, 'proj-12345');
      assert.strictEqual(deserialized[0].chatHistory.length, 2);
      assert.strictEqual(deserialized[0].idea.totalScore, 32);
      resolve();
    });
  });

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
