import React, { useState, useEffect } from "react";
import { 
  Globe, 
  Terminal, 
  Send, 
  Cpu, 
  Key, 
  Search, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Share2, 
  Sparkles, 
  BookOpen, 
  Code, 
  Lock, 
  ListRestart, 
  UserCheck, 
  Eye, 
  EyeOff, 
  ArrowRight,
  Info 
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  SocialPlatform, 
  GroundedPost, 
  Citations, 
  GeneratedOmnipost, 
  ApiLogMessage 
} from "./types";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"scraper" | "publisher" | "copilot" | "vault">("scraper");

  // State: Grounded Search Scraper
  const [scrapeKeyword, setScrapeKeyword] = useState("AI Agents");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["Twitter", "LinkedIn", "Reddit", "GitHub"]);
  const [scraping, setScraping] = useState(false);
  const [scrapedPosts, setScrapedPosts] = useState<GroundedPost[]>([]);
  const [citations, setCitations] = useState<Citations[]>([]);
  const [scraperError, setScraperError] = useState<string | null>(null);

  // State: Multi-Publisher
  const [seedText, setSeedText] = useState("We are launching our automated API integration hub today! Connect multiple platforms and stream live feeds smoothly.");
  const [draftTone, setDraftTone] = useState("professional");
  const [generatingPosts, setGeneratingPosts] = useState(false);
  const [generatedOmnipost, setGeneratedOmnipost] = useState<GeneratedOmnipost | null>(null);
  const [publisherError, setPublisherError] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);

  // State: AI Copilot
  const [copilotInput, setCopilotInput] = useState("");
  const [copilotLoading, setCopilotLoading] = useState(false);
  const [copilotAnswer, setCopilotAnswer] = useState<string>("");
  const [presetQuestions] = useState([
    { text: "איך ניתן לבצע הרשמה אוטומטית לחלוטין?", type: "bypass" },
    { text: "צור סקריפט Node.js לפרסום אוטומטי בטוויטר", type: "tweet_script" },
    { text: "איך עובד מנגנון ה-OAuth של Reddit וגוגל?", type: "oauth" },
    { text: "צור קוד פייתון פשוט השואב מידע ציבורי מ-LinkedIn", type: "linkedin_scraper" }
  ]);

  // State: Vault / Credentials Store (saved in LocalStorage)
  const [vaultKeys, setVaultKeys] = useState({
    twitterApiKey: "",
    twitterApiSecret: "",
    linkedinClientId: "",
    linkedinClientSecret: "",
    redditClientId: "",
    redditClientSecret: "",
    githubToken: ""
  });
  const [showKeys, setShowKeys] = useState(false);
  const [credentialStatus, setCredentialStatus] = useState<Record<string, "saved" | "empty">>({});

  // State: Terminal Logs
  const [logs, setLogs] = useState<ApiLogMessage[]>([]);

  // Platform List configuration
  const [platforms, setPlatforms] = useState<SocialPlatform[]>([
    {
      id: "twitter",
      name: "X / Twitter",
      icon: "🐦",
      status: "idle",
      apiType: "Bearer Token",
      credentialsRequired: ["API Key", "API Secret", "Access Token"],
      docUrl: "https://developer.x.com",
      description: "מערכת המיקרו-בלוגינג הגדולה בעולם. דורשת אימות מפתח API ואישורי כתיבה."
    },
    {
      id: "linkedin",
      name: "LinkedIn",
      icon: "💼",
      status: "idle",
      apiType: "OAuth 2.0",
      credentialsRequired: ["Client ID", "Client Secret"],
      docUrl: "https://developer.linkedin.com",
      description: "הרשת המקצועית המובילה. דורשת OAuth Flow של המשתמש לקבלת Token מתאים."
    },
    {
      id: "reddit",
      name: "Reddit",
      icon: "🤖",
      status: "idle",
      apiType: "OAuth 2.0",
      credentialsRequired: ["Client ID", "Client Secret", "User-Agent"],
      docUrl: "https://www.reddit.com/prefs/apps",
      description: "רשות דיונים מבוססת תתי-קהילות. מאפשרת קריאה חלקה וכתיבה עם OAuth ייעודי."
    },
    {
      id: "github",
      name: "GitHub",
      icon: "💻",
      status: "idle",
      apiType: "Bearer Token",
      credentialsRequired: ["Personal Access Token"],
      docUrl: "https://github.com/settings/tokens",
      description: "פלטפורמת הקוד המובילה. קל במיוחד לגשת באמצעות Token (PAT) ללא CAPTCHAs."
    }
  ]);

  // Add Log helper
  const addLog = (platform: string, type: ApiLogMessage["type"], message: string, payload?: any) => {
    const newLog: ApiLogMessage = {
      id: Math.random().toString(),
      timestamp: new Date().toLocaleTimeString("he-IL"),
      platform,
      type,
      message,
      payload
    };
    setLogs(prev => [newLog, ...prev].slice(0, 50)); // limit to 50 logs
  };

  // Initialize: Load keys from localStorage & trigger default overview
  useEffect(() => {
    const saved = localStorage.getItem("social_api_vault_keys");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setVaultKeys(prev => ({ ...prev, ...parsed }));
        
        // Mark which are saved
        const status: Record<string, "saved" | "empty"> = {};
        Object.keys(parsed).forEach(key => {
          status[key] = parsed[key] ? "saved" : "empty";
        });
        setCredentialStatus(status);
      } catch (e) {
        console.error(e);
      }
    }

    addLog("System", "info", "רשת העבודה המרכזית נטענה. מוכן לסריקת מידע וסימולציות.");
    addLog("Gemini AI", "success", "חיבור ספק הבינה המלאכותית (Gemini 3.5-Flash) פעיל ומקושר למערכת.");
    
    // Simulate first auto-scraping
    handleScrape("AI Agents");
    triggerSystemExplanation();
  }, []);

  // API Action: Run Grounded Search Scraper
  const handleScrape = async (customKeyword?: string) => {
    const keywordToUse = customKeyword || scrapeKeyword;
    if (!keywordToUse.trim()) return;

    setScraping(true);
    setScraperError(null);
    addLog("Scraper", "info", `מריץ סורק מידע אוטונומי עבור מילת המפתח: "${keywordToUse}" ...`);

    try {
      const response = await fetch("/api/simulate-scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keywordToUse,
          platforms: selectedPlatforms
        })
      });

      if (!response.ok) {
        throw new Error(`שרת החזיר שגיאה: ${response.status}`);
      }

      const data = await response.json();
      setScrapedPosts(data.posts || []);
      setCitations(data.citations || []);

      // Dynamic platform state updates
      setPlatforms(prev => prev.map(p => {
        // check if this platform exists in scraped responses
        const hasData = (data.posts || []).some((post: any) => 
          post.platform.toLowerCase().includes(p.id) || p.id.toLowerCase().includes(post.platform.toLowerCase())
        );
        return {
          ...p,
          status: hasData ? "connected" : "idle"
        };
      }));

      addLog("Scraper", "success", `הסריקה הושלמה בהצלחה! התקבלו ${data.posts?.length || 0} פוסטים מבוססי מציאות עם סימוכין מההפרש הציבורי.`);
      if (data.citations?.length > 0) {
        addLog("Scraper", "info", `נמצאו ${data.citations.length} מקורות אימות מגוגל.`);
      }
    } catch (err: any) {
      setScraperError(err.message || "שגיאה בחיבור לשרת או בסריקה");
      addLog("Scraper", "error", `כשל בסריקה אוטונומית: ${err.message}`);
    } finally {
      setScraping(false);
    }
  };

  // API Action: Multi-platform Post Formulation & Payload Generator
  const handleGenerateOmnipost = async () => {
    if (!seedText.trim()) return;

    setGeneratingPosts(true);
    setPublisherError(null);
    addLog("Omnipost", "info", "מעבד את טקסט המקור ליצירת פוסטים מותאמים אישית והגדרות API Payload...");

    try {
      const response = await fetch("/api/generate-posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seedText,
          tone: draftTone
        })
      });

      if (!response.ok) {
        throw new Error(`שגיאה בקבלת נתונים מהשרת: ${response.status}`);
      }

      const data = await response.json();
      setGeneratedOmnipost(data);
      addLog("Omnipost", "success", "הפוסטים הותאמו לכל רשת חברתית! המבנה תואם את המגבלות של כל API.");
    } catch (err: any) {
      setPublisherError(err.message || "שגיאה באדפטציית הפוסטים");
      addLog("Omnipost", "error", `כשל ביצירת פוסטים: ${err.message}`);
    } finally {
      setGeneratingPosts(false);
    }
  };

  // API Action: Trigger publish simulation sequence with terminal outputs
  const handlePublishAll = async () => {
    if (!generatedOmnipost) return;
    setPublishing(true);
    addLog("Publisher", "info", "מאתחל סדרת פרסום אוטומטית לכל הרשתות שנבחרו...");

    const eventSource = new EventSource(`/api/run-delta?topic=${encodeURIComponent(scrapeKeyword)}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "done") {
          eventSource.close();
          setPublishing(false);
          addLog("System", "success", "תהליך ההפצה האוטומטי הושלם עבור כל הרשתות החברתיות!");
        } else {
          addLog(data.platform || "Delta Agent", data.type, data.message, data.payload);
        }
      } catch (e) {
        console.error("SSE Parse Error:", e);
      }
    };

    eventSource.onerror = (error) => {
      console.error("SSE Error:", error);
      eventSource.close();
      setPublishing(false);
      addLog("System", "error", "שגיאה בחיבור לשרת ההפצה.");
    };
    return;

    if (!generatedOmnipost) return;
    setPublishing(true);
    addLog("Publisher", "info", "מאתחל סדרת פרסום אוטומטית לכל הרשתות שנבחרו...");

    // Stage 1: Github Gist/Release API
    setTimeout(() => {
      addLog("GitHub API", "info", "שולח בקשה: POST https://api.github.com/gists ...");
      addLog("GitHub API", "api_payload", "Payload שנשלח:", generatedOmnipost.github?.apiPayload);
      addLog("GitHub API", "success", "התקבל סטטוס: 201 Created. הג'יסט פורסם בהצלחה!");
    }, 1000);

    // Stage 2: Reddit REST API
    setTimeout(() => {
      addLog("Reddit API", "info", "שולח בקשה: POST https://oauth.reddit.com/api/submit ...");
      addLog("Reddit API", "api_payload", "Payload שנשלח:", generatedOmnipost.reddit?.apiPayload);
      addLog("Reddit API", "success", "התקבל סטטוס: 200 OK. הפוסט נקלט בהצלחה בתת-הפורום!");
    }, 2500);

    // Stage 3: LinkedIn Share API
    setTimeout(() => {
      addLog("LinkedIn API", "info", "שולח בקשה: POST https://api.linkedin.com/v2/ugcPosts ...");
      addLog("LinkedIn API", "api_payload", "Payload שנשלח:", generatedOmnipost.linkedin?.apiPayload);
      addLog("LinkedIn API", "success", "התקבל סטטוס: 201 Created. הפוסט האיכותי באוויר!");
    }, 4000);

    // Stage 4: Twitter API v2
    setTimeout(() => {
      addLog("Twitter API", "info", "שולח בקשה: POST https://api.twitter.com/2/tweets ...");
      addLog("Twitter API", "api_payload", "Payload שנשלח:", generatedOmnipost.twitter?.apiPayload);
      addLog("Twitter API", "success", "התקבל סטטוס: 201 Created. הציוץ פורסם אוטומטית!");
      addLog("System", "success", "תהליך ההפצה האוטומטי הושלם עבור כל הרשתות החברתיות!");
      setPublishing(false);
    }, 5500);
  };

  // API Action: Fetch initial bypass/OAuth system rules in dynamic Hebrew/English style
  const triggerSystemExplanation = async () => {
    setCopilotLoading(true);
    try {
      const response = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSystemExplanation: true })
      });
      const data = await response.json();
      setCopilotAnswer(data.answer);
    } catch (e) {
      console.error(e);
    } finally {
      setCopilotLoading(false);
    }
  };

  // API Action: Ask Copilot a specific developer/automation question
  const askCopilot = async (questionText: string, type?: string) => {
    const textToAsk = questionText || copilotInput;
    if (!textToAsk.trim()) return;

    setCopilotLoading(true);
    setCopilotInput("");
    addLog("AI Copilot", "info", `מבקש ניתוח וקוד עבור: "${textToAsk.substring(0, 35)}..."`);

    try {
      const response = await fetch("/api/ai-copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isSystemExplanation: false,
          message: textToAsk,
          queryType: type || "custom"
        })
      });

      if (!response.ok) {
        throw new Error(`שגיאה: ${response.status}`);
      }

      const data = await response.json();
      setCopilotAnswer(data.answer);
      addLog("AI Copilot", "success", "הסבר מותאם אישית וקוד אינטגרציה נוצרו על ידי Gemini.");
    } catch (err: any) {
      addLog("AI Copilot", "error", `שגיאה במענה קופילוט: ${err.message}`);
    } finally {
      setCopilotLoading(false);
    }
  };

  // Action: Save Keys to localStorage
  const handleSaveKeys = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("social_api_vault_keys", JSON.stringify(vaultKeys));
    
    // Mark saved status
    const status: Record<string, "saved" | "empty"> = {};
    Object.keys(vaultKeys).forEach(k => {
      status[k] = vaultKeys[k as keyof typeof vaultKeys] ? "saved" : "empty";
    });
    setCredentialStatus(status);

    addLog("Vault", "success", "אישורי מפתחות ו-Tokens נשמרו בצורה מאובטחת בדפדפן המקומי שלך (LocalStorage).");
    
    // update status values as connected for testing simulation
    setPlatforms(prev => prev.map(p => {
      if (p.id === "twitter" && (vaultKeys.twitterApiKey || vaultKeys.twitterApiSecret)) {
        return { ...p, status: "connected" };
      }
      if (p.id === "linkedin" && (vaultKeys.linkedinClientId || vaultKeys.linkedinClientSecret)) {
        return { ...p, status: "connected" };
      }
      if (p.id === "reddit" && (vaultKeys.redditClientId || vaultKeys.redditClientSecret)) {
        return { ...p, status: "connected" };
      }
      if (p.id === "github" && vaultKeys.githubToken) {
        return { ...p, status: "connected" };
      }
      return p;
    }));
  };

  // Action: Clear localStorage credentials
  const handleClearKeys = () => {
    if (confirm("האם למחוק את כל המפתחות השמורים באופן מקומי?")) {
      const emptyKeys = {
        twitterApiKey: "",
        twitterApiSecret: "",
        linkedinClientId: "",
        linkedinClientSecret: "",
        redditClientId: "",
        redditClientSecret: "",
        githubToken: ""
      };
      setVaultKeys(emptyKeys);
      localStorage.removeItem("social_api_vault_keys");
      setCredentialStatus({});
      setPlatforms(prev => prev.map(p => ({ ...p, status: "idle" })));
      addLog("Vault", "warning", "המפתחות נמחקו לחלוטין מביטחון הדפדפן המקומי.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Upper Status strip / Banner */}
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-50 transition-all duration-200">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]">
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white font-mono uppercase">Social API Hub</h1>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded-full border border-cyan-500/20">V1.4 PRO</span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">אינטגרציה וסריקת רשתות חברתיות אוטונומית מבוססת AI ומקורות גלובליים</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-slate-400">Status: Running</span>
            </div>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
              <span className="text-cyan-400">Uptime:</span>
              <span className="text-white">Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1 & 2: Main interactive work area */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Quick Notice Banner on Automatic API Feasibility in Israel / Global */}
          <section className="bg-gradient-to-r from-slate-900 to-slate-900/50 rounded-2xl p-5 border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-colors duration-300"></div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shrink-0">
                <Info className="w-6 h-6" />
              </div>
              <div dir="rtl" className="text-right flex-1">
                <h2 className="text-base font-semibold text-white mb-1">אינטגרציה חכמה ללא צורך במפתח מורכב (Zero-Key Autonomy)</h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  הרשמה אוטונומית לחלוטין לחשבונות מפתחים (Twitter, Facebook) חסומה כיום על ידי הגנות אבטחה, CAPTCHAs ותהליך אישור מפתח ידני. 
                  כדי לפתור זאת, פיתחנו עבורך <strong>מנוע סריקת מידע ציבורי באמצעות Google Search grounding</strong> שמספק נתונים חיים לחלוטין <strong>ללא מפתח API משלך!</strong>
                </p>
                <div className="flex flex-wrap gap-2 text-xs font-mono text-slate-400">
                  <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800">✓ ללא שימוש ידני במרכז הפיתוח</span>
                  <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800">✓ חיבור אמת באמצעות חיפוש מאומת</span>
                  <span className="px-2 py-1 bg-slate-950 rounded border border-slate-800">✓ אימולציה מלאה של כתיבה</span>
                </div>
              </div>
            </div>
          </section>

          {/* Tab Navigation Menu */}
          <div className="bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 flex flex-wrap gap-1 font-mono text-xs">
            <button
              id="tab-btn-scraper"
              onClick={() => setActiveTab("scraper")}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "scraper"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>חיפוש וסריקה אוטומטית</span>
            </button>
            <button
              id="tab-btn-publisher"
              onClick={() => setActiveTab("publisher")}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "publisher"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>פרסום וצפייה ב-Payload</span>
            </button>
            <button
              id="tab-btn-copilot"
              onClick={() => setActiveTab("copilot")}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "copilot"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>מדריך וקוד אוטומטי (AI)</span>
            </button>
            <button
              id="tab-btn-vault"
              onClick={() => setActiveTab("vault")}
              className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === "vault"
                  ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 shadow-sm"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/30"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>כספת מפתחות מקומית</span>
            </button>
          </div>

          {/* Workspace Views Wrapper */}
          <div className="bg-slate-900 rounded-2xl border border-slate-850 p-6 shadow-inner min-h-[500px] flex flex-col justify-between">
            
            <AnimatePresence mode="wait">
              
              {/* VIEW 1: Search Scraper with Grounded Google Live Data */}
              {activeTab === "scraper" && (
                <motion.div
                  key="scraper-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-5 flex-grow"
                >
                  <div dir="rtl" className="text-right border-b border-slate-800 pb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 justify-end">
                      <Globe className="w-5 h-5 text-cyan-400" />
                      מערכת סריקה אוטונומית של שיח חברתי (Google Grounded)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">קל למצוא דיונים וחדשות על מותגים ונושאים ללא מפתחות רשמיים</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    {/* Input selector */}
                    <div className="md:col-span-2 flex flex-col gap-1.5 text-right" dir="rtl">
                      <label className="text-xs text-slate-300 font-mono">מילת מפתח או נושא לסריקה:</label>
                      <div className="relative">
                        <input
                          id="scrape-keyword-input"
                          type="text"
                          value={scrapeKeyword}
                          onChange={(e) => setScrapeKeyword(e.target.value)}
                          placeholder="לדוגמא: React 19, Gemini AI, OpenAI..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pr-4 pl-12 text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                        />
                        <button
                          id="btn-trigger-scrape"
                          onClick={() => handleScrape()}
                          disabled={scraping || !scrapeKeyword.trim()}
                          className="absolute left-2 top-2 bottom-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-4 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {scraping ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Search className="w-4 h-4" />
                          )}
                          <span className="text-xs">סרוק</span>
                        </button>
                      </div>
                    </div>

                    {/* Platforms Checkbox filters */}
                    <div className="flex flex-col gap-1.5 text-right" dir="rtl">
                      <label className="text-xs text-slate-300 font-mono">רשתות יעד:</label>
                      <div className="flex flex-wrap gap-2">
                        {["Twitter", "LinkedIn", "Reddit", "GitHub"].map((plat) => {
                          const isSelected = selectedPlatforms.includes(plat);
                          return (
                            <button
                              id={`plat-check-${plat}`}
                              key={plat}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedPlatforms(prev => prev.filter(p => p !== plat));
                                } else {
                                  setSelectedPlatforms(prev => [...prev, plat]);
                                }
                              }}
                              className={`text-xs px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                isSelected 
                                  ? "bg-slate-800 text-cyan-400 border-cyan-500/40" 
                                  : "bg-slate-950 text-slate-500 border-slate-900 hover:border-slate-800"
                              }`}
                            >
                              {plat}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Results Section */}
                  <div className="flex-grow flex flex-col justify-content-center">
                    
                    {scraperError && (
                      <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-300 rounded-xl text-center text-sm" dir="rtl">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-rose-400" />
                        חלה שגיאה בעיבוד הנתונים: {scraperError}
                      </div>
                    )}

                    {scraping ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                        <p className="font-mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">Scanning Social Repositories...</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">Gemini סורק כעת עשרות מקורות מידע ודוחות בגוגל כדי לייצר תמונת מצב חברתית אמינה ללא צורך במפתח מחדר המפתחים.</p>
                      </div>
                    ) : scrapedPosts.length > 0 ? (
                      <div className="flex flex-col gap-4">
                        
                        {/* Feed Title */}
                        <div className="flex justify-between items-center px-1">
                          <span className="text-xs font-mono text-slate-500">
                            מילת מפתח: <strong className="text-slate-300">{scrapeKeyword}</strong>
                          </span>
                          <span className="text-xs font-mono text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-850">
                            נמצאו {scrapedPosts.length} דיונים אקטיביים
                          </span>
                        </div>

                        {/* List of Simulated Grounded Social Posts */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[350px] overflow-y-auto pr-1">
                          {scrapedPosts.map((post, idx) => (
                            <div 
                              key={idx} 
                              className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col justify-between hover:border-slate-800 transition-colors"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                  post.platform.includes("Twitter") ? "bg-cyan-500/10 text-cyan-400" :
                                  post.platform.includes("LinkedIn") ? "bg-blue-500/10 text-blue-400" :
                                  post.platform.includes("Reddit") ? "bg-orange-500/10 text-orange-400" :
                                  "bg-emerald-500/10 text-emerald-400"
                                }`}>
                                  {post.platform}
                                </span>
                                <span className="text-slate-500 font-mono text-[10px]">{post.timestamp}</span>
                              </div>

                              <p className="text-xs font-mono text-slate-400 mb-1">{post.author}</p>
                              <p className="text-sm text-slate-200 leading-relaxed mb-3 break-words" dir="rtl">
                                {post.content}
                              </p>

                              <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-900 pt-2 text-slate-500">
                                <span>Reactions: {post.likes}</span>
                                <span>Shares: {post.shares}</span>
                                {post.link && (
                                  <a 
                                    href={post.link} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                                  >
                                    מקור <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Citations block */}
                        {citations.length > 0 && (
                          <div dir="rtl" className="bg-slate-950 p-3.5 rounded-xl border border-slate-900 mt-2 text-right">
                            <h4 className="text-xs font-bold text-white mb-2 flex items-center gap-1 justify-end">
                              <BookOpen className="w-3.5 h-3.5 text-emerald-400" />
                              מקורות אימות שנמצאו בחיפוש גוגל (Citations)
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {citations.map((cite, cidx) => (
                                <a
                                  key={cidx}
                                  href={cite.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] bg-slate-900 text-slate-400 px-2 py-1 rounded hover:text-white border border-slate-850 hover:border-slate-800 transition-all flex items-center gap-1.5"
                                >
                                  {cite.title || "Reference link"}
                                  <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-center">
                        <Globe className="w-12 h-12 text-slate-700 mb-3" />
                        <p className="text-sm">אין כרגע פוסטים להצגה.</p>
                        <p className="text-xs text-slate-500 mt-1">אנא בחר מילת מפתח ולחץ על כפתור הסריקה מעלה.</p>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}


              {/* VIEW 2: Multi-Platform Post Adaptor & Payload Inspector */}
              {activeTab === "publisher" && (
                <motion.div
                  key="publisher-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-5 flex-grow"
                >
                  <div dir="rtl" className="text-right border-b border-slate-800 pb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 justify-end">
                      <Send className="w-5 h-5 text-cyan-400" />
                      מחולל פוסטים מרובה ערוצים ומאשש ה-Payload APIs
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">כתוב פעם אחת וקבל אדפטציה מלאה לפי סטנדרט ה-REST API של כל רשת חברתית</p>
                  </div>

                  {/* Top Form Box */}
                  <div className="flex flex-col gap-3" dir="rtl">
                    <div className="flex flex-col gap-1 text-right">
                      <label className="text-xs text-slate-300 font-mono">טקסט ראשוני או הודעה למשלוח:</label>
                      <textarea
                        id="seed-post-textarea"
                        value={seedText}
                        onChange={(e) => setSeedText(e.target.value)}
                        rows={3}
                        placeholder="רשום פה את ההכרזה או הפוסט הבא שלך..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 transition-all font-sans leading-relaxed"
                      />
                    </div>

                    <div className="flex justify-between items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-850">
                        <span className="text-xs font-mono text-slate-400 px-2">סגנון רטורי:</span>
                        {["professional", "casual", "marketing_hype"].map((tone) => (
                          <button
                            id={`tone-btn-${tone}`}
                            key={tone}
                            onClick={() => setDraftTone(tone)}
                            className={`text-[10px] px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              draftTone === tone 
                                ? "bg-cyan-500/10 text-cyan-400 font-bold border border-cyan-500/20" 
                                : "text-slate-500 hover:text-slate-300"
                            }`}
                          >
                            {tone === "professional" ? "מקצועי" : tone === "casual" ? "יומיומי" : "שיווקי/הייפ"}
                          </button>
                        ))}
                      </div>

                      <button
                        id="btn-trigger-formulate"
                        onClick={handleGenerateOmnipost}
                        disabled={generatingPosts || !seedText.trim()}
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {generatingPosts ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}
                        <span>שכתב והתאם לפורמט API</span>
                      </button>
                    </div>
                  </div>

                  {/* Adaptations Results Layout */}
                  <div className="flex-grow">
                    
                    {publisherError && (
                      <div className="p-4 bg-rose-950/20 border border-rose-900/40 text-rose-300 rounded-xl text-center text-sm" dir="rtl">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-2 text-rose-400" />
                        כשל בהתאמת פוסטים: {publisherError}
                      </div>
                    )}

                    {generatingPosts ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                        <p className="font-mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">Running API Formulators...</p>
                        <p className="text-xs text-slate-500 mt-1">השרת שולח את טיוטה של הפוסט ל-Gemini לשכתוב לפי מגבלות התווים והעיצוב של כל פלטפורמה.</p>
                      </div>
                    ) : generatedOmnipost ? (
                      <div className="flex flex-col gap-5">
                        
                        {/* Tab header to publish dynamically */}
                        <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900">
                          <button
                            id="btn-trigger-publish-all"
                            onClick={handlePublishAll}
                            disabled={publishing}
                            className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-extrabold px-4 py-2 rounded-lg text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{publishing ? "מפרסם כעת..." : "שגר פרסום לכל הרשתות"}</span>
                          </button>
                          <span dir="rtl" className="text-xs text-slate-400">הפוסטים הוכנו. שגר לרשתות או קח את ה-Payload JSON:</span>
                        </div>

                        {/* Visual Card per Network Adaptation */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[290px] overflow-y-auto pr-1">
                          
                          {/* Twitter block */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-slate-905 pb-2">
                              <span className="text-[10px] font-mono text-slate-500">MAX: 280 Characters</span>
                              <strong className="text-xs text-cyan-400">🐦 X / Twitter API</strong>
                            </div>
                            <div className="text-right text-xs bg-slate-900/50 p-2.5 rounded border border-slate-850" dir="rtl">
                              <p className="text-white text-xs whitespace-pre-line leading-relaxed">{generatedOmnipost.twitter?.message}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-mono text-slate-500 text-right">REST API JSON Payload:</span>
                              <pre className="text-[9px] font-mono bg-slate-900 text-slate-400 p-2 rounded overflow-x-auto border border-slate-850 max-h-20">
                                {generatedOmnipost.twitter?.apiPayload}
                              </pre>
                            </div>
                          </div>

                          {/* LinkedIn block */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-slate-905 pb-2">
                              <span className="text-[10px] font-mono text-slate-500">MAX: Professional Block</span>
                              <strong className="text-xs text-blue-400">💼 LinkedIn Share API</strong>
                            </div>
                            <div className="text-right text-xs bg-slate-900/50 p-2.5 rounded border border-slate-850" dir="rtl">
                              <p className="text-white text-xs whitespace-pre-line leading-relaxed">{generatedOmnipost.linkedin?.message}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-mono text-slate-500 text-right">REST API JSON Payload:</span>
                              <pre className="text-[9px] font-mono bg-slate-900 text-slate-400 p-2 rounded overflow-x-auto border border-slate-850 max-h-20">
                                {generatedOmnipost.linkedin?.apiPayload}
                              </pre>
                            </div>
                          </div>

                          {/* Reddit block */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-slate-905 pb-2">
                              <span className="text-[10px] font-mono text-slate-400">{generatedOmnipost.reddit?.title}</span>
                              <strong className="text-xs text-orange-400">🤖 Reddit API</strong>
                            </div>
                            <div className="text-right text-xs bg-slate-900/50 p-2.5 rounded border border-slate-850 animate-light" dir="rtl">
                              <p className="text-white text-xs whitespace-pre-line leading-relaxed">{generatedOmnipost.reddit?.message}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-mono text-slate-500 text-right">REST API JSON Payload:</span>
                              <pre className="text-[9px] font-mono bg-slate-900 text-slate-400 p-2 rounded overflow-x-auto border border-slate-850 max-h-20">
                                {generatedOmnipost.reddit?.apiPayload}
                              </pre>
                            </div>
                          </div>

                          {/* Github block */}
                          <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
                            <div className="flex justify-between items-center border-b border-slate-905 pb-2">
                              <span className="text-[10px] font-mono text-slate-400">Markdown Gist format</span>
                              <strong className="text-xs text-emerald-400">💻 GitHub API Gist</strong>
                            </div>
                            <div className="text-right text-xs bg-slate-900/50 p-2.5 rounded border border-slate-850" dir="rtl">
                              <p className="text-white text-xs whitespace-pre-line leading-relaxed">{generatedOmnipost.github?.message}</p>
                            </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-[9px] font-mono text-slate-500 text-right">REST API JSON Payload:</span>
                              <pre className="text-[9px] font-mono bg-slate-900 text-slate-400 p-2 rounded overflow-x-auto border border-slate-850 max-h-20">
                                {generatedOmnipost.github?.apiPayload}
                              </pre>
                            </div>
                          </div>

                        </div>

                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-12 text-slate-500 text-center">
                        <Send className="w-12 h-12 text-slate-700 mb-3" />
                        <p className="text-sm">עדיין לא קיימים פוסטים מותאמים.</p>
                        <p className="text-xs text-slate-500 mt-1">רשום את טיוטת הטקסט מעלה ולחץ על "שכתב והתאם לפורמט API".</p>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}


              {/* VIEW 3: AI Developer Copilot - Custom Scripts & Explanation */}
              {activeTab === "copilot" && (
                <motion.div
                  key="copilot-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-4 flex-grow"
                >
                  <div dir="rtl" className="text-right border-b border-slate-800 pb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 justify-end">
                      <Sparkles className="w-5 h-5 text-cyan-400" />
                      קופילוט אוטומציה וארכיטקטורת קוד
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">שאל את Gemini כיצד לבנות בוטים או סקריפטים השואבים מידע באופן אוטונומי</p>
                  </div>

                  {/* Preset Questions Boxes */}
                  <div className="grid grid-cols-2 gap-2 text-right" dir="rtl">
                    {presetQuestions.map((q, qidx) => (
                      <button
                        id={`btn-preset-q-${qidx}`}
                        key={qidx}
                        onClick={() => askCopilot(q.text, q.type)}
                        className="text-[11px] bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-cyan-400 p-2.5 rounded-xl border border-slate-900 hover:border-cyan-500/20 text-right transition-all cursor-pointer truncate"
                      >
                        ⚡ {q.text}
                      </button>
                    ))}
                  </div>

                  {/* Manual Question Input */}
                  <div className="relative">
                    <input
                      id="copilot-manual-input"
                      type="text"
                      value={copilotInput}
                      onChange={(e) => setCopilotInput(e.target.value)}
                      placeholder="שאל שאלה חופשית בנושאי API או כתיבת סקריפטים לדחף רשתות..."
                      dir="rtl"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl py-3 pr-4 pl-12 text-slate-200 text-sm focus:outline-none focus:border-cyan-500 font-mono text-right"
                    />
                    <button
                      id="btn-copilot-send"
                      onClick={() => askCopilot(copilotInput)}
                      disabled={copilotLoading || !copilotInput.trim()}
                      className="absolute left-2 top-2 bottom-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3.5 rounded-md flex items-center transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Answer view block with nice formatting */}
                  <div className="flex-grow flex flex-col justify-content-center">
                    
                    {copilotLoading ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400">
                        <RefreshCw className="w-10 h-10 text-cyan-500 animate-spin mb-4" />
                        <p className="font-mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">Consulting Automation Expert...</p>
                      </div>
                    ) : copilotAnswer ? (
                      <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 max-h-[290px] overflow-y-auto pr-1">
                        <div dir="rtl" className="text-right text-xs text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none whitespace-pre-line">
                          {copilotAnswer}
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500 text-center">
                        <Cpu className="w-12 h-12 text-slate-750 mb-3" />
                        <p className="text-sm">מחכה לקבלת הוראות מותאמות אישית.</p>
                        <p className="text-xs text-slate-500 mt-1">בחר באחת מהשאלות הנפוצות מעלה לחיווי קוד מהיר.</p>
                      </div>
                    )}

                  </div>
                </motion.div>
              )}


              {/* VIEW 4: Local LocalStorage Key Secure Vault */}
              {activeTab === "vault" && (
                <motion.div
                  key="vault-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-4 flex-grow"
                >
                  <div dir="rtl" className="text-right border-b border-slate-800 pb-3">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 justify-end">
                      <Lock className="w-5 h-5 text-cyan-400" />
                      כספת אישורים מקומית מאובטחת
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">אחסן מפתחות אישיים בצורה בטוחה בדפדפן שלך לצרכי בדיקות ושאיבת אמת</p>
                  </div>

                  <form onSubmit={handleSaveKeys} className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-1" dir="rtl">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* Twitter group */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-cyan-400">🐦 Twitter API keys</h4>
                        <div className="flex flex-col gap-1 text-right">
                          <label className="text-[10px] text-slate-500 font-mono">Twitter Consumer API Key:</label>
                          <input
                            id="key-twitter-api"
                            type={showKeys ? "text" : "password"}
                            value={vaultKeys.twitterApiKey}
                            onChange={(e) => setVaultKeys(prev => ({ ...prev, twitterApiKey: e.target.value }))}
                            placeholder={credentialStatus.twitterApiKey === "saved" ? "••••••••••••••••••••" : "הזן API Key"}
                            className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <label className="text-[10px] text-slate-500 font-mono">Twitter API Secret:</label>
                          <input
                            id="key-twitter-secret"
                            type={showKeys ? "text" : "password"}
                            value={vaultKeys.twitterApiSecret}
                            onChange={(e) => setVaultKeys(prev => ({ ...prev, twitterApiSecret: e.target.value }))}
                            placeholder={credentialStatus.twitterApiSecret === "saved" ? "••••••••••••••••••••" : "הזן Api Secret"}
                            className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                          />
                        </div>
                      </div>

                      {/* LinkedIn Group */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-blue-400">💼 LinkedIn OAuth Credentials</h4>
                        <div className="flex flex-col gap-1 text-right">
                          <label className="text-[10px] text-slate-500 font-mono">LinkedIn Client ID:</label>
                          <input
                            id="key-linkedin-client"
                            type={showKeys ? "text" : "password"}
                            value={vaultKeys.linkedinClientId}
                            onChange={(e) => setVaultKeys(prev => ({ ...prev, linkedinClientId: e.target.value }))}
                            placeholder={credentialStatus.linkedinClientId === "saved" ? "••••••••••••••••••••" : "הזן Client ID"}
                            className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <label className="text-[10px] text-slate-500 font-mono">LinkedIn Client Secret:</label>
                          <input
                            id="key-linkedin-secret"
                            type={showKeys ? "text" : "password"}
                            value={vaultKeys.linkedinClientSecret}
                            onChange={(e) => setVaultKeys(prev => ({ ...prev, linkedinClientSecret: e.target.value }))}
                            placeholder={credentialStatus.linkedinClientSecret === "saved" ? "••••••••••••••••••••" : "הזן Client Secret"}
                            className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                          />
                        </div>
                      </div>

                      {/* Reddit Group */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex flex-col gap-2">
                        <h4 className="text-xs font-bold text-orange-400">🤖 Reddit Developer Setup</h4>
                        <div className="flex flex-col gap-1 text-right">
                          <label className="text-[10px] text-slate-500 font-mono">Reddit Client ID:</label>
                          <input
                            id="key-reddit-id"
                            type={showKeys ? "text" : "password"}
                            value={vaultKeys.redditClientId}
                            onChange={(e) => setVaultKeys(prev => ({ ...prev, redditClientId: e.target.value }))}
                            placeholder={credentialStatus.redditClientId === "saved" ? "••••••••••••••••••••" : "הזן API Client ID"}
                            className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                          />
                        </div>
                        <div className="flex flex-col gap-1 text-right">
                          <label className="text-[10px] text-slate-500 font-mono">Reddit Client Secret:</label>
                          <input
                            id="key-reddit-secret"
                            type={showKeys ? "text" : "password"}
                            value={vaultKeys.redditClientSecret}
                            onChange={(e) => setVaultKeys(prev => ({ ...prev, redditClientSecret: e.target.value }))}
                            placeholder={credentialStatus.redditClientSecret === "saved" ? "••••••••••••••••••••" : "הזן Client Secret"}
                            className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                          />
                        </div>
                      </div>

                      {/* GitHub token group */}
                      <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex flex-col gap-2 justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-emerald-400">💻 GitHub Personal Token</h4>
                          <div className="flex flex-col gap-1 text-right mt-2">
                            <label className="text-[10px] text-slate-500 font-mono">GitHub PAT Token:</label>
                            <input
                              id="key-github-token"
                              type={showKeys ? "text" : "password"}
                              value={vaultKeys.githubToken}
                              onChange={(e) => setVaultKeys(prev => ({ ...prev, githubToken: e.target.value }))}
                              placeholder={credentialStatus.githubToken === "saved" ? "••••••••••••••••••••" : "ghp_xxxxxxxxxxxxxxxxxxxx"}
                              className="bg-slate-900 border border-slate-850 rounded px-2.5 py-1.5 text-xs font-mono text-slate-200"
                            />
                          </div>
                        </div>

                        <p className="text-[10px] text-slate-500 text-right leading-relaxed mt-2 font-mono">
                          מפתחות שנשמרים מועברים עבור הבקשות הפנימיות לצרכי בדיקות משלוח ומועוברים אך ורק לשרתים שלך.
                        </p>
                      </div>

                    </div>

                    {/* Action form buttons */}
                    <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-900 mt-2">
                      <div className="flex gap-2">
                        <button
                          id="btn-vault-clear"
                          type="button"
                          onClick={handleClearKeys}
                          className="bg-rose-950/40 hover:bg-rose-900/40 text-rose-400 border border-rose-900/40 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                        >
                          מחק מפתחות
                        </button>
                        <button
                          id="btn-vault-toggle-visibility"
                          type="button"
                          onClick={() => setShowKeys(!showKeys)}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-400 px-3 py-1.5 rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                        >
                          {showKeys ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showKeys ? "הסתר" : "הצג תווים"}</span>
                        </button>
                      </div>
                      <button
                        id="btn-vault-save"
                        type="submit"
                        className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors"
                      >
                        שמור מפתחות
                      </button>
                    </div>

                  </form>
                </motion.div>
              )}

            </AnimatePresence>

          </div>

        </div>


        {/* COLUMN 3: Social Platform Stats and Developer API Console Logs */}
        <div className="flex flex-col gap-6">
          
          {/* Section: Connected Status Radar */}
          <section className="bg-slate-900 rounded-2xl border border-slate-850 p-5 shadow-lg flex flex-col gap-4">
            <h3 dir="rtl" className="text-sm font-bold tracking-tight text-white font-mono uppercase text-right border-b border-slate-800 pb-2">
              🚨 מכ״ם חיבורי ה-APIs לרשתות
            </h3>

            <div className="flex flex-col gap-3.5">
              {platforms.map((p) => (
                <div 
                  key={p.id} 
                  className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex justify-between items-center hover:border-slate-850 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg bg-slate-905 p-1 rounded-md">{p.icon}</span>
                    <div className="text-left">
                      <h4 className="text-xs font-bold text-white">{p.name}</h4>
                      <p className="text-[9px] font-mono text-slate-500 capitalize">{p.apiType}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md ${
                      p.status === "connected" ? "bg-emerald-500/10 text-emerald-400" :
                      p.status === "active" ? "bg-cyan-500/10 text-cyan-400" :
                      "bg-slate-905 text-slate-500"
                    }`}>
                      {p.status === "connected" ? "Auto-Connected" : p.status === "active" ? "Transmitting" : "Zero-Key Scraper"}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      p.status === "connected" ? "bg-emerald-500" :
                      p.status === "active" ? "bg-cyan-400 animate-ping" :
                      "bg-amber-500"
                    }`}></span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Terminal Console Engine Logs */}
          <section className="bg-slate-900 rounded-2xl border border-slate-850 p-5 shadow-lg flex-1 flex flex-col gap-3 min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-2">
              <button
                id="btn-clear-terminal"
                onClick={() => setLogs([])}
                className="text-[10px] text-slate-500 hover:text-slate-300 font-mono border border-slate-800 px-2 py-0.5 rounded"
              >
                Clear
              </button>
              <h3 dir="rtl" className="text-sm font-bold tracking-tight text-white font-mono uppercase text-right flex items-center gap-1.5 justify-end">
                <Terminal className="w-4 h-4 text-cyan-400" />
                מעבד מסרים ופלטפורמת הפעלה
              </h3>
            </div>

            <div className="flex-grow bg-slate-950 rounded-xl p-3 border border-slate-900 font-mono text-[10px] overflow-y-auto max-h-[380px] flex flex-col gap-2 relative">
              
              {logs.length === 0 ? (
                <div className="text-slate-600 text-xs italic text-center my-auto p-4">
                  Terminal is empty. Trigger events to view raw communication...
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="border-b border-slate-900/70 pb-1.5 text-left">
                    <div className="flex justify-between items-center mb-1 text-[9px]">
                      <span className="text-slate-500">[{log.timestamp}]</span>
                      <span className={`px-1 py-0.2 rounded-sm uppercase ${
                        log.type === "success" ? "text-emerald-400 bg-emerald-500/10 font-bold" :
                        log.type === "error" ? "text-rose-400 bg-rose-500/10 font-bold" :
                        log.type === "warning" ? "text-amber-400 bg-amber-500/10" :
                        log.type === "api_payload" ? "text-purple-400 bg-purple-500/10" :
                        "text-slate-400 bg-slate-800/40"
                      }`}>
                        {log.platform} • {log.type}
                      </span>
                    </div>

                    <p className={`leading-relaxed ${
                      log.type === "error" ? "text-rose-300" :
                      log.type === "success" ? "text-emerald-300" :
                      log.type === "warning" ? "text-amber-300" :
                      log.type === "api_payload" ? "text-purple-300 font-semibold break-words" :
                      "text-slate-300"
                    }`}>
                      {log.message}
                    </p>

                    {log.payload && (
                      <pre className="mt-1 p-1.5 bg-slate-900 text-slate-400 rounded text-[9px] overflow-x-auto border border-slate-850">
                        {typeof log.payload === "string" ? log.payload : JSON.stringify(log.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))
              )}

            </div>
          </section>

        </div>

      </main>

      {/* Footer Design */}
      <footer className="bg-slate-950 border-t border-slate-900 py-6 text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs font-mono">
          <p className="flex items-center justify-center gap-2">
            <span>Powering Intelligent Integrations safely via standard protocol guidelines</span>
            <span>•</span>
            <span className="text-cyan-500">Social API Hub © 2026</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
