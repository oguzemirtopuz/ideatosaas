export type Language = 'tr' | 'en';

export interface Translations {
  // Header
  appTitle: string;
  appSubtitle: string;
  historyBtn: string;
  vaultBtn: string;
  settingsBtn: string;
  lightMode: string;
  darkMode: string;
  stage1Tab: string;
  stage2Tab: string;
  stage3Tab: string;
  stage4Tab: string;

  // Aşama 1: Fikir Motoru
  stage1Title: string;
  stage1Desc: string;
  signalsBadge: string;
  signalsToggleShow: string;
  signalsToggleHide: string;
  signalsDiscussionsTitle: string;
  signalsTrendsTitle: string;
  customIdeaPlaceholder: string;
  customIdeaBtn: string;
  generateIdeasBtn: string;
  generatingIdeasTitle: string;
  generatingIdeasSub: string;
  judgeBoxTitle: string;
  judgeBoxBadge: string;
  badgeHighPotential: string;
  badgeTrap: string;
  badgeNiche: string;
  judgeEvaluationLabel: string;
  problemLabel: string;
  targetLabel: string;
  whyNowLabel: string;
  mvpScopeLabel: string;
  scorePain: string;
  scoreLack: string;
  scoreSpeed: string;
  scoreMonetization: string;
  selectIdeaBtn: string;

  // Aşama 2: Şartname / PRD
  stage2Title: string;
  stage2Desc: string;
  backToIdeasBtn: string;
  buildAppBtn: string;
  buildingAppTitle: string;
  buildingAppSub: string;
  tabOverview: string;
  tabUserFlows: string;
  tabDataModel: string;
  tabScreens: string;
  tabOutOfScope: string;
  valuePropTitle: string;
  targetAudienceTitle: string;
  techArchTitle: string;
  stepPrefix: string;
  outOfScopeNotice: string;

  // Aşama 3: Canlı Sandbox & AI Chat
  stage3Title: string;
  stage3Desc: string;
  backToSpecBtn: string;
  goToGtmBtn: string;
  generatingGtmTitle: string;
  generatingGtmSub: string;
  tabLiveApp: string;
  tabCodeEditor: string;
  tabAiChat: string;
  deviceDesktop: string;
  deviceTablet: string;
  deviceMobile: string;
  reloadPreview: string;
  openNewTab: string;
  copyCodeBtn: string;
  copiedBtn: string;
  downloadZipQuick: string;
  v1ChipsTitle: string;
  chatPlaceholder: string;
  sendChatBtn: string;
  aiApplyingChanges: string;

  // Aşama 4: GTM & Export
  stage4Title: string;
  stage4Desc: string;
  backToEditorBtn: string;
  downloadFullZipBtn: string;
  launchChannelsTitle: string;
  viralHooksTitle: string;
  pricingStrategyTitle: string;
  marketingCopyTitle: string;
  downloadSuccessTitle: string;
  downloadSuccessDesc: string;

  // Modallar
  settingsModalTitle: string;
  settingsModalDesc: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  saveSettingsBtn: string;
  cancelBtn: string;
  logoutBtn: string;
  historyModalTitle: string;
  historyModalDesc: string;
  noProjectsYet: string;
  resumeProjectBtn: string;
  deleteProjectBtn: string;
  closeBtn: string;

  // Fikir Havuzu & Bookmark
  bookmarkIdeaTooltip: string;
  unbookmarkIdeaTooltip: string;
  vaultModalTitle: string;
  vaultModalDesc: string;
  noSavedIdeas: string;
  buildSavedIdeaBtn: string;
  deleteSavedIdeaBtn: string;
  ideaSavedToast: string;
  ideaRemovedToast: string;

  // Uyarılar
  quotaWarningTitle: string;
  quotaWarningDesc: string;
  missingKeyWarning: string;
}

export const translations: Record<Language, Translations> = {
  tr: {
    // Header
    appTitle: "Idea to SaaS",
    appSubtitle: "Otonom Ürün Prototipleme & GTM Motoru",
    historyBtn: "Projelerim",
    vaultBtn: "Fikir Havuzu",
    settingsBtn: "API & Hesap",
    lightMode: "Açık Mod",
    darkMode: "Koyu Mod",
    stage1Tab: "1. Fikir Motoru",
    stage2Tab: "2. PRD Şartname",
    stage3Tab: "3. Canlı Uygulama",
    stage4Tab: "4. Lansman & Çıkış",

    // Aşama 1: Fikir Motoru
    stage1Title: "Canlı Pazar Sinyalleri & Mikro-SaaS Fikirleri",
    stage1Desc: "Hacker News ve Dev.to tartışmalarını canlı analiz eder, filtrelenmiş yüksek karlı SaaS fırsatları sunar.",
    signalsBadge: "Canlı Piyasa Telemetrisi",
    signalsToggleShow: "Piyasa Sinyallerini Göster",
    signalsToggleHide: "Piyasa Sinyallerini Gizle",
    signalsDiscussionsTitle: "Geliştirici Şikayetleri & Acı Noktaları",
    signalsTrendsTitle: "Güncel Arama Trendleri",
    customIdeaPlaceholder: "Aklınızdaki fikri yazın (Örn: Emlakçılar için AI müşteri arama ve WhatsApp yanıtlama aracı)...",
    customIdeaBtn: "Fikri Analiz Et & Geliştir",
    generateIdeasBtn: "Pazar Sinyalleriyle 3 Fikir Üret",
    generatingIdeasTitle: "Canlı Pazar Sinyalleri Taranıyor...",
    generatingIdeasSub: "Hacker News ve Dev.to tartışmaları filtreleniyor, yatırımcı skoru hesaplanıyor.",
    judgeBoxTitle: "Yatırımcı & Hakem Tavsiyesi",
    judgeBoxBadge: "Canlı Eleme",
    badgeHighPotential: "🟢 Yüksek Potansiyel (Önerilen)",
    badgeTrap: "🔴 Tuzak / Zor Pazar",
    badgeNiche: "🟡 Niş Fırsat",
    judgeEvaluationLabel: "Hakem Değerlendirmesi",
    problemLabel: "Problem",
    targetLabel: "Hedef Kitle",
    whyNowLabel: "Neden Şimdi",
    mvpScopeLabel: "MVP Kapsamı (v1)",
    scorePain: "Acı",
    scoreLack: "Boşluk",
    scoreSpeed: "Hız",
    scoreMonetization: "Para",
    selectIdeaBtn: "Bununla Devam Et (Aşama 2)",

    // Aşama 2: Şartname / PRD
    stage2Title: "Teknik Ürün Şartnamesi (PRD)",
    stage2Desc: "Yatırımcı seviyesinde mimari sınırlar, kullanıcı akışları ve v1 kapsamı.",
    backToIdeasBtn: "Fikirlere Dön",
    buildAppBtn: "Canlı Uygulamayı İnşa Et (Aşama 3)",
    buildingAppTitle: "Canlı React Uygulaması Yazılıyor...",
    buildingAppSub: "Bileşenler, Tailwind sınıfları ve yerel durum yönetimi derleniyor.",
    tabOverview: "Genel Bakış",
    tabUserFlows: "Kullanıcı Akışları",
    tabDataModel: "Veri Modeli",
    tabScreens: "Ekranlar",
    tabOutOfScope: "v1 Kapsam Dışı",
    valuePropTitle: "Değer Önerisi & Çözüm",
    targetAudienceTitle: "Hedef Kitle (ICP)",
    techArchTitle: "Teknik Mimari (1 Günde Canlıya Çıkış)",
    stepPrefix: "Adım",
    outOfScopeNotice: "Aşağıdaki özellikler v1 MVP'sinde bilerek kapsam dışı bırakılmıştır. v1 sonrasında AI asistanı ile bunları tek tıkla ekleyebilirsiniz.",

    // Aşama 3: Canlı Sandbox & AI Chat
    stage3Title: "Canlı React 18 Sandbox & AI Asistanı",
    stage3Desc: "Gerçek zamanlı derlenen izole prototip ve tek tıkla v1 geliştirme asistanı.",
    backToSpecBtn: "PRD Şartnameye Dön",
    goToGtmBtn: "Pazarlama Stratejisine Geç (Aşama 4)",
    generatingGtmTitle: "Go-to-Market Stratejisi Hazırlanıyor...",
    generatingGtmSub: "Lansman kanalları, viral kancalar ve fiyatlandırma hesaplanıyor.",
    tabLiveApp: "Canlı Önizleme",
    tabCodeEditor: "Kaynak Kodu",
    tabAiChat: "AI Geliştirme Asistanı",
    deviceDesktop: "Masaüstü",
    deviceTablet: "Tablet",
    deviceMobile: "Mobil",
    reloadPreview: "Yenile",
    openNewTab: "Yeni Sekmede Aç",
    copyCodeBtn: "Kodu Kopyala",
    copiedBtn: "Kopyalandı!",
    downloadZipQuick: "Hızlı ZIP İndir",
    v1ChipsTitle: "💡 v1 Yol Haritası Önerileri (Tek Tıkla Uygula)",
    chatPlaceholder: "Uygulamada neyi değiştirmek istersiniz? (Örn: Buton rengini değiştir, yeni sekme ekle...)",
    sendChatBtn: "Gönder",
    aiApplyingChanges: "Yapay zeka kodu güvenle güncelliyor...",

    // Aşama 4: GTM & Export
    stage4Title: "Go-to-Market & Büyüme Stratejisi",
    stage4Desc: "Ürününüzü ilk 100 müşteriye ulaştıracak kanallar, fiyatlandırma ve viral kancalar.",
    backToEditorBtn: "Uygulama Editörüne Dön",
    downloadFullZipBtn: "Eksiksiz Proje ZIP Paketini İndir",
    launchChannelsTitle: "🚀 Lansman & Dağıtım Kanalları",
    viralHooksTitle: "🪝 Viral Kancalar & Dikkat Çekici Açılar",
    pricingStrategyTitle: "💰 Fiyatlandırma & Monetizasyon Modeli",
    marketingCopyTitle: "📝 Yüksek Dönüşümlü Pazarlama Metinleri",
    downloadSuccessTitle: "Proje Paketi Hazır!",
    downloadSuccessDesc: "ZIP dosyası; SPEC.md, README.md, index.html ve üretim App.jsx dosyasını içerir.",

    // Modallar
    settingsModalTitle: "Hesap & API Ayarları",
    settingsModalDesc: "Kendi ücretsiz Groq veya Gemini anahtarınızı ekleyerek sınırsız hızda prototip üretin.",
    apiKeyLabel: "Özel Groq API Anahtarı (İsteğe Bağlı)",
    apiKeyPlaceholder: "gsk_...",
    emailLabel: "E-posta Adresiniz (Projeleri Hatırlamak İçin)",
    emailPlaceholder: "ornek@sirket.com",
    saveSettingsBtn: "Ayarları Kaydet",
    cancelBtn: "Vazgeç",
    logoutBtn: "Çıkış Yap",
    historyModalTitle: "Kayıtlı Projelerim",
    historyModalDesc: "Daha önce ürettiğiniz ve üzerinde çalıştığınız mikro-SaaS prototipleri.",
    noProjectsYet: "Henüz kayıtlı bir proje bulunamadı. Hemen yeni bir fikir üretin!",
    resumeProjectBtn: "Projeyi Aç",
    deleteProjectBtn: "Sil",
    closeBtn: "Kapat",

    // Fikir Havuzu & Bookmark
    bookmarkIdeaTooltip: "Fikri Havuzuma Kaydet",
    unbookmarkIdeaTooltip: "Fikri Havuzumdan Çıkar",
    vaultModalTitle: "Kaydedilen Fikir Havuzu",
    vaultModalDesc: "Daha sonra prototiplemek üzere kaydettiğiniz mikro-SaaS fikirleri.",
    noSavedIdeas: "Henüz kaydedilmiş bir fikir yok. Beğendiğiniz fikirlerin sağ üstündeki yer imi (bookmark) butonuna tıklayarak havuza ekleyebilirsiniz!",
    buildSavedIdeaBtn: "🚀 Şimdi İnşa Et (Aşama 2)",
    deleteSavedIdeaBtn: "Kaldır",
    ideaSavedToast: "Fikir havuzuna kaydedildi!",
    ideaRemovedToast: "Fikir havuzundan çıkarıldı.",

  // Uyarılar
    quotaWarningTitle: "Kota / API Uyarısı",
    quotaWarningDesc: "Sistemin varsayılan kotası doldu. Kesintisiz kullanım için Ayarlar bölümünden kendi ücretsiz API anahtarınızı girebilirsiniz.",
    missingKeyWarning: "API anahtarı bulunamadı, güvenli pazar fikirleri yüklendi."
  },
  en: {
    // Header
    appTitle: "Idea to SaaS",
    appSubtitle: "Autonomous Product Prototyping & GTM Engine",
    historyBtn: "My Projects",
    vaultBtn: "Idea Vault",
    settingsBtn: "API & Account",
    lightMode: "Light Mode",
    darkMode: "Dark Mode",
    stage1Tab: "1. Idea Engine",
    stage2Tab: "2. Technical PRD",
    stage3Tab: "3. Live App Sandbox",
    stage4Tab: "4. Launch & Export",

    // Aşama 1: Fikir Motoru
    stage1Title: "Live Market Signals & Micro-SaaS Opportunities",
    stage1Desc: "Live real-time telemetry from Hacker News & Dev.to filtered for high-ROI micro-SaaS niches.",
    signalsBadge: "Live Market Telemetry",
    signalsToggleShow: "Show Market Signals",
    signalsToggleHide: "Hide Market Signals",
    signalsDiscussionsTitle: "Developer Complaints & Pain Points",
    signalsTrendsTitle: "Trending Search Queries",
    customIdeaPlaceholder: "Type your product concept (e.g. AI-powered speed-to-lead responder for realtors)...",
    customIdeaBtn: "Analyze & Refine Concept",
    generateIdeasBtn: "Harvest 3 High-Signal Ideas",
    generatingIdeasTitle: "Analyzing Live Market Telemetry...",
    generatingIdeasSub: "Filtering Hacker News & Dev.to discussions, calculating investor ROI index.",
    judgeBoxTitle: "Investor & Verdict Recommendation",
    judgeBoxBadge: "Live Screening",
    badgeHighPotential: "🟢 High Potential (Recommended)",
    badgeTrap: "🔴 Market Trap / Saturated",
    badgeNiche: "🟡 Niche Opportunity",
    judgeEvaluationLabel: "Verdict Analysis",
    problemLabel: "Problem",
    targetLabel: "Target Audience (ICP)",
    whyNowLabel: "Why Now",
    mvpScopeLabel: "MVP Scope (v1)",
    scorePain: "Pain",
    scoreLack: "Void",
    scoreSpeed: "Speed",
    scoreMonetization: "Revenue",
    selectIdeaBtn: "Proceed with This (Stage 2)",

    // Aşama 2: Şartname / PRD
    stage2Title: "Technical Product Specification (PRD)",
    stage2Desc: "Investor-grade architectural boundaries, user flows, and explicit v1 scope definitions.",
    backToIdeasBtn: "Back to Ideas",
    buildAppBtn: "Compile Live Application (Stage 3)",
    buildingAppTitle: "Authoring Interactive React 18 App...",
    buildingAppSub: "Synthesizing modular components, Tailwind styles, and defensive state management.",
    tabOverview: "Overview",
    tabUserFlows: "User Flows",
    tabDataModel: "Data Model",
    tabScreens: "Screens",
    tabOutOfScope: "v1 Out-of-Scope",
    valuePropTitle: "Value Proposition & Solution",
    targetAudienceTitle: "Target Audience (ICP)",
    techArchTitle: "Technical Architecture (Zero-Cost 1-Day Ship)",
    stepPrefix: "Step",
    outOfScopeNotice: "The following capabilities are deliberately kept out-of-scope for v1 to guarantee immediate launch. You can expand them using the AI Copilot.",

    // Aşama 3: Canlı Sandbox & AI Chat
    stage3Title: "Live React 18 Sandbox & AI Copilot",
    stage3Desc: "Isolated, in-browser compiled runtime with instant AI evolution copilot.",
    backToSpecBtn: "Back to PRD Spec",
    goToGtmBtn: "Proceed to GTM Strategy (Stage 4)",
    generatingGtmTitle: "Synthesizing Go-to-Market Blueprint...",
    generatingGtmSub: "Engineering launch vectors, viral distribution hooks, and pricing tiers.",
    tabLiveApp: "Live Preview",
    tabCodeEditor: "Source Code",
    tabAiChat: "AI Refactor Copilot",
    deviceDesktop: "Desktop",
    deviceTablet: "Tablet",
    deviceMobile: "Mobile",
    reloadPreview: "Reload",
    openNewTab: "Open in Tab",
    copyCodeBtn: "Copy Code",
    copiedBtn: "Copied!",
    downloadZipQuick: "Quick ZIP Export",
    v1ChipsTitle: "💡 v1 Roadmap Suggestions (Click to Apply)",
    chatPlaceholder: "What would you like to refine? (e.g., change accent color, add dark mode toggle...)",
    sendChatBtn: "Send",
    aiApplyingChanges: "AI is safely compiling live code modifications...",

    // Aşama 4: GTM & Export
    stage4Title: "Go-to-Market & Distribution Engine",
    stage4Desc: "Acquisition channels, viral distribution hooks, and pricing models to land your first 100 paid users.",
    backToEditorBtn: "Back to Code Editor",
    downloadFullZipBtn: "Download Complete Project ZIP",
    launchChannelsTitle: "🚀 Acquisition & Launch Vectors",
    viralHooksTitle: "🪝 Viral Distribution Hooks & Angles",
    pricingStrategyTitle: "💰 Monetization Architecture & Pricing",
    marketingCopyTitle: "📝 High-Converting Launch Copy",
    downloadSuccessTitle: "Project Archive Ready!",
    downloadSuccessDesc: "ZIP package contains SPEC.md, README.md, index.html, and production App.jsx.",

    // Modallar
    settingsModalTitle: "Account & API Settings",
    settingsModalDesc: "Bring your own free Groq or Gemini API key for uncapped generation velocity.",
    apiKeyLabel: "Custom Groq API Key (Optional)",
    apiKeyPlaceholder: "gsk_...",
    emailLabel: "Your Email (For Project Persistence)",
    emailPlaceholder: "founder@domain.com",
    saveSettingsBtn: "Save Settings",
    cancelBtn: "Cancel",
    logoutBtn: "Sign Out",
    historyModalTitle: "Saved Projects",
    historyModalDesc: "Review and resume your previously prototyped micro-SaaS products.",
    noProjectsYet: "No saved projects found. Ideate and launch your first one now!",
    resumeProjectBtn: "Resume Project",
    deleteProjectBtn: "Delete",
    closeBtn: "Close",

    // Fikir Havuzu & Bookmark
    bookmarkIdeaTooltip: "Save Idea to Vault",
    unbookmarkIdeaTooltip: "Remove from Vault",
    vaultModalTitle: "Saved Idea Vault",
    vaultModalDesc: "Micro-SaaS concepts you bookmarked to build when you have time.",
    noSavedIdeas: "No saved ideas yet. Click the bookmark icon on any idea card to save it for later!",
    buildSavedIdeaBtn: "🚀 Build This Now (Stage 2)",
    deleteSavedIdeaBtn: "Remove",
    ideaSavedToast: "Idea saved to vault!",
    ideaRemovedToast: "Idea removed from vault.",

  // Uyarılar
    quotaWarningTitle: "Quota / API Notice",
    quotaWarningDesc: "Shared quota limit reached. Provide your own free API key in Settings for unlimited generations.",
    missingKeyWarning: "API key unconfigured, loaded verified market fallback ideas."
  }
};
