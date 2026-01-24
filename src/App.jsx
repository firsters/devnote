import React, { useState, useEffect, useMemo, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import * as mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist";

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

import { 
  signInWithPopup, 
  onAuthStateChanged, 
  signOut 
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot 
} from "firebase/firestore";
import { auth, db, googleProvider } from "./firebase";
import {
  Search,
  Plus,
  Code,
  Trash2,
  Edit2,
  Copy,
  Check,
  Folder,
  Terminal,
  Server,
  Globe,
  Hash,
  X,
  Menu,
  Settings,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  RefreshCw,
  AlertTriangle,
  FileText,
  Download,
  Upload,
  FileCode,
  Smartphone,
  Share,
  Layout,
  Info,
} from "lucide-react";

// -----------------------------------------------------------------------------
// 앱 버전 및 설정
// -----------------------------------------------------------------------------
const APP_VERSION = "20260122.090600 GMT+9";
const STORAGE_KEY_DATA = "devnote_data_v11";
const STORAGE_KEY_CATS = "devnote_cats_v11";
const STORAGE_KEY_VIEW_MODE = "devnote_view_mode_v11";
const APP_TITLE = "DevNote";

// -----------------------------------------------------------------------------
// 1. 초기 데이터
// -----------------------------------------------------------------------------
const INITIAL_SNIPPETS = [
  {
    id: "1",
    title: "앱 모드 실행 확인",
    category: "Welcome",
    content: `현재 앱이 **전체 화면(Standalone)**으로 실행 중인지 확인해보세요.
상단 주소창이 없다면 성공입니다!

**설치 방법 리마인드:**
- **PC**: 주소창 우측 [앱 설치] 아이콘 클릭
- **Mobile**: 브라우저 메뉴 > [홈 화면에 추가]

*안드로이드 앱 목록에 보이려면 HTTPS 서버에 정식 배포가 필요할 수 있습니다.*`,
    code: "",
    createdAt: new Date().toISOString(),
    tags: ["PWA", "Tutorial"],
  },
];

const INITIAL_CATEGORIES = [
  { id: "all", name: "전체 보기", parentId: null },
  { id: "cat_welcome", name: "Welcome", parentId: null },
  { id: "cat_dev", name: "Development", parentId: null },
  { id: "cat_front", name: "Frontend", parentId: "cat_dev" },
  { id: "cat_back", name: "Backend", parentId: "cat_dev" },
];

// -----------------------------------------------------------------------------
// 2. PWA Manifest & Meta Injection (강력한 앱 모드 설정)
// -----------------------------------------------------------------------------
const usePWAInjection = () => {
  useEffect(() => {
    if (typeof document === "undefined") return;

    // 1. 타이틀 강제 설정
    document.title = APP_TITLE;

    // 2. 모바일 앱 메타 태그 주입
    const metaTags = [
      { name: "application-name", content: APP_TITLE },
      { name: "apple-mobile-web-app-title", content: APP_TITLE },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      {
        name: "apple-mobile-web-app-status-bar-style",
        content: "black-translucent",
      },
      { name: "theme-color", content: "#ffffff" },
      {
        name: "viewport",
        content:
          "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover",
      },
      { name: "mobile-web-app-capable", content: "yes" },
    ];

    metaTags.forEach((tag) => {
      let el = document.querySelector(`meta[name="${tag.name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.name = tag.name;
        document.head.appendChild(el);
      }
      el.content = tag.content;
    });

    // 3. 동적 매니페스트 (Manifest) 생성
    const manifest = {
      name: APP_TITLE,
      short_name: APP_TITLE,
      start_url: ".",
      display: "standalone",
      background_color: "#ffffff",
      theme_color: "#2563eb",
      orientation: "portrait-primary",
      icons: [
        {
          src: "/logo.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "/logo.png",
          sizes: "192x192",
          type: "image/png",
        },
      ],
    };

    const stringManifest = JSON.stringify(manifest);
    const blob = new Blob([stringManifest], { type: "application/json" });
    const manifestURL = URL.createObjectURL(blob);

    let link = document.querySelector("#dynamic-manifest");
    if (!link) {
      link = document.createElement("link");
      link.id = "dynamic-manifest";
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = manifestURL;

    // 4. 아이콘 링크 주입 (iOS용)
    let iconLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.rel = "apple-touch-icon";
      document.head.appendChild(iconLink);
    }
    iconLink.href = "/logo.png";
  }, []);
};

// -----------------------------------------------------------------------------
// 3. 유틸리티 & 뷰어 컴포넌트
// -----------------------------------------------------------------------------

const CodeBlock = ({ code }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const lines = code.split("\n");

  return (
    <div className="bg-[#f4f5f7] text-slate-800 rounded-lg my-4 overflow-hidden border border-slate-200 shadow-sm group font-sans">
      <div className="flex justify-between items-center px-3 py-1 bg-[#ebecf0] border-b border-slate-200">
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          Code Block
        </span>
        <button
          onClick={handleCopy}
          className="text-[11px] flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors py-0.5 px-2 rounded hover:bg-white"
        >
          {copied ? (
            <Check size={12} className="text-green-500" />
          ) : (
            <Copy size={12} />
          )}{" "}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <div className="flex bg-[#f4f5f7] custom-scrollbar overflow-x-auto">
        {/* Line Numbers */}
        <div className="bg-[#ebecf0]/50 text-slate-400 text-right py-4 pr-3 pl-4 select-none border-r border-slate-200 text-[12px] font-mono min-w-[3.5rem] leading-relaxed">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        {/* Code Content */}
        <pre className="p-4 text-[13px] font-mono leading-relaxed flex-1">
          <code className="block whitespace-pre">{code}</code>
        </pre>
      </div>
    </div>
  );
};

const MarkdownView = ({ content, code }) => {
  if (!content) return null;

  return (
    <div className="devnote-markdown">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");
            if (!inline) {
              return <CodeBlock code={codeContent} />;
            }
            return (
              <code className={`${className} mx-0.5`} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
      {code && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-400 mb-1">
            Attached Code:
          </div>
          <CodeBlock code={code} />
        </div>
      )}
    </div>
  );
};

const TagChip = ({ tag, onClick, active }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick(tag);
    }}
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors
      ${
        active
          ? "bg-blue-600 text-white"
          : "bg-blue-50 text-blue-600 hover:bg-blue-100"
      }
    `}
  >
    <Hash size={10} /> {tag}
  </button>
);

const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, type = "danger" }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-zoom-in">
        <div className="p-6 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${type === 'danger' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
            {type === 'danger' ? <Trash2 size={24} /> : <Info size={24} />}
          </div>
          <h3 className="font-bold text-lg text-slate-800 mb-2">{title}</h3>
          <p className="text-slate-600 text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex border-t border-slate-100">
          <button 
            onClick={onCancel}
            className="flex-1 px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-50 border-r border-slate-100 transition-colors"
          >
            취소
          </button>
          <button 
            onClick={onConfirm}
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${type === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-blue-600 hover:bg-blue-50'}`}
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};

const CategoryNode = ({
  category,
  depth,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
  editingId,
  onEditStart,
  onEditSave,
  onEditCancel,
  onDelete,
  renameValue,
  onRenameValueChange,
  noteCount,
}) => {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;
  const isEditing = editingId === category.id;

  const getIcon = () => {
    if (category.id === "all") return <Folder size={16} />;
    return (
      <Folder 
        size={16} 
        className={isSelected || isExpanded ? "text-blue-500" : "text-slate-400"} 
      />
    );
  };

  return (
    <>
      <div
        onClick={() => {
          if (!isEditing) {
            onSelect(category.id);
            if (hasChildren) onToggle(category.id);
          }
        }}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors mb-0.5 group/cat
          ${isSelected ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-100"}
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <div
          className={`p-0.5 rounded ${hasChildren ? "visible" : "invisible"}`}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </div>
        <span className="flex-shrink-0 opacity-70">{getIcon()}</span>
        
        {isEditing ? (
          <div className="flex-1 flex gap-1 pr-1" onClick={(e) => e.stopPropagation()}>
            <input
              className="flex-1 border border-blue-400 p-0.5 rounded text-xs outline-none bg-white font-normal"
              value={renameValue}
              onChange={(e) => onRenameValueChange(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') onEditSave(category.id);
                if (e.key === 'Escape') onEditCancel();
              }}
            />
            <div className="flex gap-0.5">
               <button 
                onClick={() => onEditSave(category.id)}
                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                <Check size={10} />
              </button>
              <button 
                onClick={() => onEditCancel()}
                className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
              >
                <X size={10} />
              </button>
            </div>
          </div>
        ) : (
          <>
            <span className="truncate flex-1">{category.name}</span>
            {noteCount !== undefined && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded-full shrink-0 group-hover/cat:bg-white transition-colors">
                {noteCount}
              </span>
            )}
            <div className="flex gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity translate-x-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStart(category.id, category.name);
                }}
                className="text-slate-400 hover:text-blue-600 p-1"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category.id);
                }}
                className="text-slate-400 hover:text-red-500 p-1"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </>
        )}
      </div>
      {hasChildren &&
        isExpanded &&
        category.children.map((child) => (
          <CategoryNode
            key={child.id}
            category={child}
            depth={depth + 1}
            selectedId={selectedId}
            expandedIds={expandedIds}
            onToggle={onToggle}
            onSelect={onSelect}
            editingId={editingId}
            onEditStart={onEditStart}
            onEditSave={onEditSave}
            onEditCancel={onEditCancel}
            onDelete={onDelete}
            renameValue={renameValue}
            onRenameValueChange={onRenameValueChange}
            noteCount={child.totalCount}
          />
        ))}
    </>
  );
};

// -----------------------------------------------------------------------------
// 4. 메인 앱
// -----------------------------------------------------------------------------
export default function App() {
  usePWAInjection();

  const [snippets, setSnippets] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DATA);
      return saved ? JSON.parse(saved) : INITIAL_SNIPPETS;
    } catch {
      return INITIAL_SNIPPETS;
    }
  });

  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CATS);
      return saved ? JSON.parse(saved) : INITIAL_CATEGORIES;
    } catch {
      return INITIAL_CATEGORIES;
    }
  });

  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [expandedCategoryIds, setExpandedCategoryIds] = useState(
    new Set(["cat_dev"]),
  );
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notification, setNotification] = useState(null);

  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formCategoryId, setFormCategoryId] = useState("");

  const [newCatName, setNewCatName] = useState("");
  const [newCatParentId, setNewCatParentId] = useState("");

  const [formTags, setFormTags] = useState("");
  const [selectedTag, setSelectedTag] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem(STORAGE_KEY_VIEW_MODE) || "compact";
  });
  const [expandedSnippetIds, setExpandedSnippetIds] = useState(new Set());
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: "", message: "", onConfirm: null, type: "danger" });
  
  // Category Rename States
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [renameValue, setRenameValue] = useState("");

  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const htmlInputRef = useRef(null);
  const turndownRef = useRef((() => {
      const service = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        hr: "---",
        bulletListMarker: "-",
        preformattedCode: true,
      });
      // CRITICAL: Disable indentation-based code blocks to prevent random text from becoming code
      service.remove("indentedCodeBlock");
      service.use(gfm);

    // Confluence-specific rules
    // 1. Remove line numbers from Confluence code blocks
    service.addRule("confluence-line-numbers", {
      filter: (node) => 
        node.nodeName === "TD" && (node.classList.contains("line") || node.classList.contains("rd-line-number")),
      replacement: () => "",
    });

      // 2. Specialized Code Block handling (Confluence Macro)
      service.addRule("confluence-code-macro", {
        filter: (node) => 
          (node.nodeName === "DIV" && (node.classList.contains("code-content") || node.classList.contains("code-block") || node.classList.contains("code"))) ||
          (node.nodeName === "PRE" && (node.classList.contains("syntaxhighlighter-pre") || node.classList.contains("syntaxhighlighter") || node.classList.contains("code"))),
        replacement: (content, node) => {
          // Get the actual code text without HTML if possible, or use node.textContent
          const code = node.innerText || node.textContent || "";
          const cleanCode = code.replace(/\r/g, "").trim();
          return `\n\n\`\`\`\n${cleanCode}\n\`\`\`\n\n`;
        }
      });

    // 3. Improve inline code merging
    service.addRule("confluence-inline-code", {
      filter: (node) => 
        ["code", "tt", "kbd", "samp"].includes(node.nodeName.toLowerCase()) ||
        (node.nodeName === "SPAN" && (
          node.classList.contains("code") || 
          node.style.fontFamily?.toLowerCase().includes("mono") ||
          node.style.backgroundColor === "rgb(244, 245, 247)" // Confluence inline code bg
        )),
      replacement: (content) => {
        if (!content.trim()) return "";
        return `\`${content.trim().replace(/`/g, "\\`")}\``;
      }
    });

    service.addRule("confluence-tasks", {
      filter: (node) =>
        node.nodeName === "LI" && node.classList.contains("task-list-item"),
      replacement: (content, node) => {
        const checked = node.querySelector('input[type="checkbox"]')?.checked;
        return `- [${checked ? "x" : " "}] ${content}\n`;
      },
    });

    service.addRule("confluence-headers", {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      replacement: (content, node) => {
        const hLevel = Number(node.nodeName.charAt(1));
        const prefix = "#".repeat(hLevel);
        // Header text should not have leading/trailing spaces to avoid code block triggering
        const cleanContent = node.textContent.trim();
        return `\n\n${prefix} ${cleanContent}\n\n`;
      },
    });

    return service;
  })());

  const convertWikiToMarkdown = (text) => {
    if (!text) return "";
    let md = text;
    
    // Confluence Wiki Markup conversion
    // Headers: h1. -> #, h2. -> ##, etc.
    md = md.replace(/^h([1-6])\.\s+(.*)$/gm, (match, level, content) => {
      return "#".repeat(level) + " " + content;
    });
    
    // Bold: *text* -> **text**
    md = md.replace(/\*([^\*]+)\*/g, "**$1**");
    
    // Italic: _text_ -> *text*
    md = md.replace(/_([^_]+)_/g, "*$1*");
    
    // Code Blocks: {code...}...{code} -> ```...```
    md = md.replace(/\{code(?::\w+)?\}([\s\S]*?)\{code\}/g, "\n\n```\n$1\n```\n\n");
    
    // No-format: {noformat}...{noformat} -> ```...```
    md = md.replace(/\{noformat\}([\s\S]*?)\{noformat\}/g, "\n\n```\n$1\n```\n\n");

    // Monospaced text (Confluence specific): {{text}} -> `text`
    md = md.replace(/\{\{([^\}]+)\}\}/g, "`$1`");

    // Panels/Info/Success blocks (Simplified)
    md = md.replace(/\{panel:?[^\}]*\}([\s\S]*?)\{panel\}/g, "> $1");
    md = md.replace(/\{info:?[^\}]*\}([\s\S]*?)\{info\}/g, "> [!NOTE]\n> $1");
    md = md.replace(/\{note:?[^\}]*\}([\s\S]*?)\{note\}/g, "> [!IMPORTANT]\n> $1");

    return md;
  };
    
    // Lists: # item -> 1. item, * item -> - item
    md = md.replace(/^\#\s+/gm, "1. ");
    
    // Tables (Simple conversion)
    // Confluence uses || for headers and | for rows
    md = md.replace(/^\|\|(.*)\|\|$/gm, (match, content) => {
      const cols = content.split("||").filter(c => c.trim() !== "");
      const header = "| " + cols.join(" | ") + " |";
      const separator = "| " + cols.map(() => "---").join(" | ") + " |";
      return header + "\n" + separator;
    });
    md = md.replace(/^\|(.*)\|$/gm, (match, content) => {
      if (content.includes("---")) return match; // Already converted header
      const cols = content.split("|").filter(c => c.trim() !== "");
      return "| " + cols.join(" | ") + " |";
    });

    return md;
  };

  const handlePaste = (e) => {
    const html = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');
    
    let markdown = "";
    
    if (html) {
      // 폰트 정보 등이 포함된 복잡한 HTML인 경우 turndown 사용
      markdown = turndownRef.current.turndown(html);
    } else if (plainText) {
      // 만약 컨플루언스 위키 포맷(h1. 등)이 감지되면 변환기 사용
      if (/^h[1-6]\.\s|^\* |^\|\||\{code/.test(plainText)) {
        markdown = convertWikiToMarkdown(plainText);
      } else {
        markdown = plainText;
      }
    }
    
    if (markdown) {
      e.preventDefault();
      // 커서 위치에 삽입
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const text = formContent;
      const before = text.substring(0, start);
      const after = text.substring(end);
      
      setFormContent(before + markdown + after);
      
      setTimeout(() => {
        const nextPos = start + markdown.length;
        e.target.selectionStart = e.target.selectionEnd = nextPos;
      }, 0);
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(snippets));
  }, [snippets]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(categories));
  }, [categories]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_VIEW_MODE, viewMode);
  }, [viewMode]);

  // Firebase Auth Observer
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        showNotification(`${currentUser.displayName}님, 환영합니다!`);
      }
    });
    return () => unsubscribe();
  }, []);

  // Sync with Firestore (Push local data to cloud when logged in)
  useEffect(() => {
    const syncToCloud = async () => {
      if (user && db) {
        setIsSyncing(true);
        try {
          console.log("Cloud sync started for user:", user.uid);
          await setDoc(doc(db, "users", user.uid), {
            snippets: snippets,
            categories: categories,
            lastSynced: new Date().toISOString()
          }, { merge: true });
          console.log("Cloud sync successful");
        } catch (error) {
          console.error("Cloud sync failed:", error);
          showNotification(`동기화 실패: ${error.message} (권한 설정을 확인하세요)`);
        } finally {
          setIsSyncing(false);
        }
      }
    };

    const timeoutId = setTimeout(syncToCloud, 2000); // 2초 뒤에 동기화 (디바운싱)
    return () => clearTimeout(timeoutId);
  }, [snippets, categories, user]);

  // Initial Fetch from Firestore
  useEffect(() => {
    const fetchFromCloud = async () => {
      if (user && db) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            if (cloudData.snippets) setSnippets(cloudData.snippets);
            if (cloudData.categories) setCategories(cloudData.categories);
            showNotification("클라우드 데이터를 불러왔습니다.");
          }
        } catch (error) {
          console.error("Failed to fetch cloud data:", error);
        }
      }
    };
    fetchFromCloud();
  }, [user]);

    const noteCounts = useMemo(() => {
      // 1. Direct counts (by category name - case-insensitive)
      const directCounts = {};
      snippets.forEach(s => {
        const catName = (s.category || "").toLowerCase().trim() || "미분류";
        directCounts[catName] = (directCounts[catName] || 0) + 1;
      });

      // 2. Aggregate counts (hierarchical) using IDs
      const totalsById = {};
      
      const getAggregateCount = (catId, stack = new Set()) => {
        if (totalsById[catId] !== undefined) return totalsById[catId];
        if (stack.has(catId)) return 0;
        
        const cat = categories.find(c => c.id === catId);
        if (!cat) return 0;

        const newStack = new Set(stack);
        newStack.add(catId);

        // Direct count for this category name
        const searchName = (cat.name || "").toLowerCase().trim();
        let count = (directCounts[searchName] || 0);
        
        // Add counts from subcategories
        const subCats = categories.filter(c => c.parentId === catId);
        subCats.forEach(child => {
          count += getAggregateCount(child.id, newStack);
        });
        
        totalsById[catId] = count;
        return count;
      };

      // Calculate totals for all categories
      const finalCounts = {};
      categories.forEach(cat => {
        if (cat.id !== "all") {
          const total = getAggregateCount(cat.id);
          finalCounts[cat.id] = total;
          finalCounts[cat.name.toLowerCase().trim()] = total;
        }
      });

      return finalCounts;
    }, [snippets, categories]);

    // Calculate totals for all categories
    const finalCounts = {};
    categories.forEach(cat => {
      if (cat.id !== "all") {
        const count = getAggregateCount(cat.id);
        finalCounts[cat.id] = count;
        // Keep name-based for backward compatibility with old snippets category strings
        const nameKey = (cat.name || "").toLowerCase().trim();
        if (finalCounts[nameKey] === undefined) {
          finalCounts[nameKey] = count;
        }
      }
    });

    return finalCounts;
  }, [snippets, categories]);

  const categoryTree = useMemo(() => {
    const tree = [];
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = { ...cat, children: [], totalCount: noteCounts[cat.id] ?? noteCounts[cat.name] ?? 0 };
    });
    categories.forEach((cat) => {
      if (cat.id === "all") return;
      if (cat.parentId && map[cat.parentId]) {
        map[cat.parentId].children.push(map[cat.id]);
      } else {
        tree.push(map[cat.id]);
      }
    });
    return tree;
  }, [categories, noteCounts]);

  const getDescendantIds = (rootId) => {
    const ids = [rootId];
    const findChildren = (parentId) => {
      categories
        .filter((c) => c.parentId === parentId)
        .forEach((child) => {
          ids.push(child.id);
          findChildren(child.id);
        });
    };
    findChildren(rootId);
    return ids;
  };

  const filteredSnippets = useMemo(() => {
    let result = snippets;
    const q = searchQuery.trim().toLowerCase();

    // 검색어가 있으면 전역 검색 (카테고리/태그 무시)
    if (q) {
      return result.filter(s => 
        (s.title || "").toLowerCase().includes(q) || 
        (s.content || "").toLowerCase().includes(q) ||
        (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
      );
    }

    // 검색어가 없으면 일반 필터링
    // 1. 카테고리 필터링
    if (selectedCategoryId !== "all") {
      const targetIds = getDescendantIds(selectedCategoryId);
      const targetNames = categories
        .filter((c) => targetIds.includes(c.id))
        .map((c) => c.name);
      result = result.filter((s) => targetNames.includes(s.category));
    }

    // 2. 태그 필터링
    if (selectedTag) {
      result = result.filter((s) => s.tags && s.tags.includes(selectedTag));
    }

    return result;
  }, [snippets, selectedCategoryId, categories, selectedTag, searchQuery]);

  const allTags = useMemo(() => {
    const tags = new Set();
    snippets.forEach((s) => {
      if (s.tags) s.tags.forEach((t) => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [snippets]);

  const showNotification = (message) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSaveSnippet = () => {
    if (!formTitle.trim()) return;
    const catName =
      categories.find((c) => c.id === formCategoryId)?.name || "Welcome";
    if (editingId) {
      setSnippets((prev) =>
        prev.map((s) =>
          s.id === editingId
            ? {
                ...s,
                title: formTitle,
                content: formContent,
                code: formCode,
                category: catName,
                tags: formTags
                  .split(",")
                  .map((t) => t.trim())
                  .filter((t) => t !== ""),
              }
            : s,
        ),
      );
      showNotification("노트가 수정되었습니다.");
    } else {
      setSnippets((prev) => [
        {
          id: Date.now().toString(),
          title: formTitle,
          content: formContent,
          code: formCode,
          category: catName,
          createdAt: new Date().toISOString(),
          tags: formTags
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t !== ""),
        },
        ...prev,
      ]);
      showNotification("새 노트가 저장되었습니다.");
    }
    setIsWriteModalOpen(false);
  };

  const toggleSnippetExpansion = (id) => {
    setExpandedSnippetIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeConfirm = () => setConfirmDialog({ ...confirmDialog, open: false });

  const handleDeleteSnippet = (id) => {
    setConfirmDialog({
      open: true,
      title: "노트 삭제",
      message: "이 노트를 정말 삭제하시겠습니까? 삭제된 내용은 복구할 수 없습니다.",
      type: "danger",
      onConfirm: () => {
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        showNotification("노트가 삭제되었습니다.");
        closeConfirm();
      },
      onCancel: closeConfirm
    });
  };

  const handleAddCategory = () => {
    const trimmedName = newCatName.trim();
    if (!trimmedName) return;
    
    // Duplicate check
    if (categories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      showNotification("이미 존재하는 폴더 이름입니다.");
      return;
    }

    const newCat = {
      id: "cat_" + Date.now(),
      name: trimmedName,
      parentId: newCatParentId || null,
    };
    setCategories([...categories, newCat]);
    setNewCatName("");
    showNotification("폴더가 추가되었습니다.");
  };

  const handleRenameCategory = (id) => {
    const trimmedName = renameValue.trim();
    if (!trimmedName) {
      setEditingCategoryId(null);
      return;
    }

    const targetCat = categories.find(c => c.id === id);
    if (!targetCat) return;

    if (targetCat.name === trimmedName) {
      setEditingCategoryId(null);
      return;
    }

    // Duplicate check
    if (categories.some(c => c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase())) {
      showNotification("이미 존재하는 폴더 이름입니다.");
      return;
    }

    const oldName = targetCat.name;

    // Update snippets
    setSnippets(prev => prev.map(s => 
      s.category === oldName ? { ...s, category: trimmedName } : s
    ));

    // Update category
    setCategories(prev => prev.map(c => 
      c.id === id ? { ...c, name: trimmedName } : c
    ));

    setEditingCategoryId(null);
    showNotification("폴더 이름이 변경되었습니다.");
  };

  const handleDeleteCategory = (id) => {
    setConfirmDialog({
      open: true,
      title: "폴더 삭제",
      message: "폴더를 삭제하시겠습니까? 하위 폴더와 노트는 최상위로 이동됩니다.",
      type: "danger",
      onConfirm: () => {
        setCategories((prev) =>
          prev
            .filter((c) => c.id !== id)
            .map((c) => (c.parentId === id ? { ...c, parentId: null } : c)),
        );
        showNotification("폴더가 삭제되었습니다.");
        closeConfirm();
      },
      onCancel: closeConfirm
    });
  };

  const openWriteModal = (snippet = null) => {
    if (snippet) {
      setEditingId(snippet.id);
      setFormTitle(snippet.title);
      setFormContent(snippet.content);
      setFormCode(snippet.code || "");
      const foundCat = categories.find((c) => c.name === snippet.category);
      setFormCategoryId(foundCat ? foundCat.id : categories[1].id);
      setFormTags(snippet.tags ? snippet.tags.join(", ") : "");
    } else {
      setEditingId(null);
      setFormTitle("");
      setFormContent("");
      setFormCode("");
      setFormCategoryId(
        selectedCategoryId === "all" ? categories[1].id : selectedCategoryId,
      );
      setFormTags("");
    }
    setIsWriteModalOpen(true);
  };

  const handleConfluenceExport = () => {
    let htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>DevNote Export</title><style>body{font-family:sans-serif;} pre{background:#f4f5f7;padding:10px;}</style></head><body><h1>DevNote Export</h1>`;
    const sortedCats = [...categories].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    sortedCats.forEach((cat) => {
      if (cat.id === "all") return;
      const catSnippets = snippets.filter((s) => s.category === cat.name);
      if (catSnippets.length === 0) return;
      htmlContent += `<h2>${cat.name}</h2>`;
      catSnippets.forEach((s) => {
        let formattedContent = s.content
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/```([\w-]*)\n([\s\S]*?)```/g, "<pre><code>$2</code></pre>");
        let attachedCode = s.code
          ? `<div><strong>Code:</strong><pre>${s.code}</pre></div>`
          : "";
        htmlContent += `<div><h3>${s.title}</h3><div>${formattedContent}</div>${attachedCode}</div><hr/>`;
      });
    });
    htmlContent += `</body></html>`;
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `DevNote_Export_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("HTML 파일이 다운로드되었습니다.");
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    try {
      showNotification(`${file.name} 파일을 읽는 중...`);
      let content = "";
      
      if (fileExtension === 'html' || fileExtension === 'htm') {
        const text = await file.text();
        // Use turndown for better markdown conversion
        content = turndownRef.current.turndown(text);
      } 
      else if (fileExtension === 'docx') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        content = turndownRef.current.turndown(result.value);
      } 
      else if (fileExtension === 'pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(" ");
          fullText += pageText + "\n\n";
        }
        content = fullText.trim();
      } 
      else {
        showNotification("지원하지 않는 파일 형식입니다. (.html, .docx, .pdf)");
        return;
      }

      if (!content) {
        showNotification("추출된 내용이 없습니다.");
        return;
      }

      setSnippets((prev) => [
        {
          id: Date.now().toString(),
          title: `[Import] ${file.name}`,
          category: "미분류",
          content: content,
          code: "",
          tags: ["import"],
          createdAt: new Date().toISOString(),
        },
        ...prev,
      ]);
      showNotification("파일에서 내용을 가져왔습니다.");
    } catch (err) {
      console.error("Import error:", err);
      showNotification("파일을 처리하는 중 오류가 발생했습니다.");
    } finally {
      e.target.value = "";
    }
  };

  const handleLogin = async () => {
    if (!auth || !googleProvider) {
      showNotification("Firebase 설정이 필요합니다. firebase.js를 확인해 주세요.");
      return;
    }
    try {
      showNotification("로그인을 진행 중입니다...");
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
      let msg = "로그인에 실패했습니다.";
      if (error.code === 'auth/popup-closed-by-user') msg = "로그인 창이 닫혔습니다.";
      else if (error.code === 'auth/unauthorized-domain') msg = "승인되지 않은 도메인입니다. Firebase 콘솔 설정을 확인하세요.";
      else msg += ` (${error.code})`;
      
      showNotification(msg);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      showNotification("로그아웃 되었습니다.");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 safe-area-inset-top">
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] px-5 py-3 rounded-full shadow-2xl text-white text-sm font-bold bg-slate-800/90 backdrop-blur border border-slate-700 flex items-center gap-3 animate-fade-in-down">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          {notification}
        </div>
      )}

      {isSyncing && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-[10px] font-bold text-slate-500 animate-fade-in">
          <RefreshCw size={12} className="animate-spin text-blue-500" />
          Cloud Syncing...
        </div>
      )}

      <ConfirmDialog {...confirmDialog} onCancel={confirmDialog.onCancel || closeConfirm} />

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 w-72 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-white">
          <div className="font-bold text-lg flex items-center gap-2 text-slate-800">
            <Code className="text-blue-600" /> {APP_TITLE}
          </div>
          <button
            className="md:hidden text-slate-400"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <div className="flex justify-between items-center mb-2 px-2">
            <span className="text-xs font-bold text-slate-400">FOLDERS</span>
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="text-slate-400 hover:text-blue-600"
            >
              <Settings size={14} />
            </button>
          </div>

          <ul>
             <li
              onClick={() => {
                setSelectedCategoryId("all");
                setSelectedTag(null);
                setSearchQuery("");
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer mb-1 ${selectedCategoryId === "all" && !selectedTag && !searchQuery ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Folder size={16} /> 
              <span className="flex-1">전체 보기</span>
              <span className="text-[10px] font-medium px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full">
                {snippets.length}
              </span>
            </li>
            {categoryTree.map((cat) => (
              <CategoryNode
                key={cat.id}
                category={cat}
                depth={0}
                selectedId={selectedCategoryId}
                expandedIds={expandedCategoryIds}
                onToggle={(id) =>
                  setExpandedCategoryIds((prev) => {
                    const next = new Set(prev);
                    next.has(id) ? next.delete(id) : next.add(id);
                    return next;
                  })
                }
                onSelect={(id) => {
                  setSelectedCategoryId(id);
                  setSelectedTag(null);
                }}
                editingId={editingCategoryId}
                onEditStart={(id, name) => {
                  setEditingCategoryId(id);
                  setRenameValue(name);
                }}
                onEditSave={handleRenameCategory}
                onEditCancel={() => setEditingCategoryId(null)}
                onDelete={handleDeleteCategory}
                renameValue={renameValue}
                onRenameValueChange={setRenameValue}
                noteCount={cat.totalCount}
              />
            ))}
          </ul>

          <div className="mt-6 mb-2 px-2 text-xs font-bold text-slate-400 uppercase">
            Tags
          </div>
          <div className="px-2 flex flex-wrap gap-1.5">
            {allTags.length > 0 ? (
              allTags.map((tag) => (
                <TagChip
                  key={tag}
                  tag={tag}
                  onClick={(t) => setSelectedTag(t === selectedTag ? null : t)}
                  active={selectedTag === tag}
                />
              ))
            ) : (
              <span className="text-[10px] text-slate-400 italic px-1">
                등록된 태그가 없습니다.
              </span>
            )}
          </div>

          <div className="mt-6 mb-2 px-2 text-xs font-bold text-slate-400">
            TOOLS
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setIsInstallModalOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-green-50 hover:text-green-700 rounded-lg text-left"
            >
              <Smartphone size={16} className="text-green-600" /> 앱 설치
              (전체화면)
            </button>
            <button
              onClick={handleConfluenceExport}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg text-left"
            >
              <FileCode size={16} className="text-blue-600" /> Confluence
              내보내기
            </button>
            <button
              onClick={() => htmlInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-left"
            >
              <Upload size={16} className="text-blue-500" /> 외부 파일
              가져오기 (PDF, Word, HTML)
            </button>
            <input
              type="file"
              ref={htmlInputRef}
              onChange={handleFileImport}
              accept=".html,.htm,.docx,.pdf"
              className="hidden"
            />
          </div>

          <div className="mt-auto pt-6 px-2">
            {user ? (
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <img src={user.photoURL} alt="profile" className="w-8 h-8 rounded-full border border-slate-200" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">{user.displayName}</span>
                    <span className="text-[10px] text-slate-400 truncate">{user.email}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-full py-2 text-xs font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button 
                onClick={handleLogin}
                className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                <Globe size={18} />
                로그인 (구글 클라우드 백업)
              </button>
            )}
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={() => openWriteModal()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-bold flex justify-center items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={16} /> 새 노트 작성
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-slate-500"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <h2 className="font-bold text-lg text-slate-800 hidden sm:block">
              {categories.find((c) => c.id === selectedCategoryId)?.name ||
                "전체 보기"}
            </h2>
          </div>
          <div className="relative w-full max-w-md ml-4">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              size={18}
            />
            <input
              className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="제목, 내용, 태그 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2 ml-4">
            <button 
              onClick={() => setViewMode(viewMode === 'compact' ? 'detailed' : 'compact')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                ${viewMode === 'detailed' 
                  ? 'bg-blue-50 border-blue-200 text-blue-700' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}
              `}
              title={viewMode === 'compact' ? '상세 정보 표시' : '타이틀만 표시'}
            >
              {viewMode === 'detailed' ? <Layout size={14}/> : <Menu size={14}/>}
              <span className="hidden sm:inline">{viewMode === 'detailed' ? '상세 모드' : '목록 모드'}</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredSnippets.length > 0 ? (
              filteredSnippets.map((snippet) => {
                const isExpanded = viewMode === 'detailed' || expandedSnippetIds.has(snippet.id);
                
                return (
                  <div
                    key={snippet.id}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                  >
                    <div 
                      className="p-5 cursor-pointer flex justify-between items-start"
                      onClick={() => toggleSnippetExpansion(snippet.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                            <Folder size={10} /> {snippet.category}
                          </span>
                          {viewMode === 'compact' && (
                            <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                              <ChevronDown size={14} className="text-slate-400" />
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 truncate">
                          {snippet.title}
                        </h3>
                        {snippet.tags && snippet.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5 focus:outline-none" onClick={(e) => e.stopPropagation()}>
                            {snippet.tags.map((tag) => (
                              <TagChip
                                key={tag}
                                tag={tag}
                                onClick={setSelectedTag}
                                active={selectedTag === tag}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openWriteModal(snippet)}
                          className="text-slate-400 hover:text-blue-600 p-1"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteSnippet(snippet.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                        <MarkdownView
                          content={snippet.content}
                          code={snippet.code}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="text-center py-20 text-slate-400 flex flex-col items-center">
                <Search size={48} className="mb-4 opacity-20" />
                <p>표시할 내용이 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Write Modal */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">
                {editingId ? "노트 수정" : "새 노트 작성"}
              </h3>
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <input
                className="w-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-lg font-bold"
                placeholder="제목"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  카테고리
                </label>
                <select
                  className="w-full p-2.5 border border-slate-300 rounded-lg bg-white outline-none focus:border-blue-500"
                  value={formCategoryId}
                  onChange={(e) => setFormCategoryId(e.target.value)}
                >
                  {categories
                    .filter((c) => c.id !== "all")
                    .map((c) => {
                      const depth = c.parentId ? 1 : 0;
                      return (
                        <option key={c.id} value={c.id}>
                          {"\u00A0".repeat(depth * 4)}
                          {c.name}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="flex flex-col h-64">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-bold text-slate-500">
                    내용 (Markdown & Code)
                  </label>
                  <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                    Tip: 코드 복붙 시 ``` 로 감싸세요
                  </span>
                </div>
                <textarea
                  className="w-full flex-1 p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 resize-none font-sans leading-relaxed"
                  placeholder={`내용 입력...\n\n\`\`\`javascript\nconsole.log("Hello");\n\`\`\``}
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  onPaste={handlePaste}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  태그 (쉼표로 구분)
                </label>
                <input
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                  placeholder="예: react, frontend, 중요"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">
                  추가 코드 스니펫 (선택 사항)
                </label>
                <textarea
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg h-24 font-mono text-sm outline-none focus:border-blue-500"
                  placeholder="// 별도로 저장하고 싶은 코드"
                  value={formCode}
                  onChange={(e) => setFormCode(e.target.value)}
                />
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end gap-2 bg-slate-50">
              <button
                onClick={() => setIsWriteModalOpen(false)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-100 font-medium"
              >
                취소
              </button>
              <button
                onClick={handleSaveSnippet}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-sm"
              >
                저장하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-800">폴더 관리</h3>
              <button onClick={() => setIsCategoryModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-6">
                <div className="flex gap-2 mb-2">
                  <input
                    className="flex-1 border p-2 rounded text-sm"
                    placeholder="새 폴더 이름"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                  />
                  <button
                    onClick={handleAddCategory}
                    className="bg-blue-600 text-white px-3 rounded text-sm font-bold"
                  >
                    추가
                  </button>
                </div>
                <select
                  className="w-full border p-2 rounded text-sm bg-slate-50"
                  value={newCatParentId}
                  onChange={(e) => setNewCatParentId(e.target.value)}
                >
                  <option value="">(최상위 폴더)</option>
                  {categories
                    .filter((c) => c.id !== "all")
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
              <div className="space-y-1">
                {categories
                  .filter((c) => c.id !== "all")
                  .map((c) => (
                    <div
                      key={c.id}
                      className="flex justify-between items-center p-2 border rounded bg-slate-50 text-sm group"
                    >
                      <div className="flex-1 flex flex-col min-w-0">
                        {editingCategoryId === c.id ? (
                          <div className="flex gap-1 pr-2">
                             <input
                              className="flex-1 border border-blue-400 p-1 rounded text-xs outline-none"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleRenameCategory(c.id);
                                if (e.key === 'Escape') setEditingCategoryId(null);
                              }}
                            />
                            <div className="flex gap-0.5">
                              <button 
                                onClick={() => handleRenameCategory(c.id)}
                                className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              >
                                <Check size={12} />
                              </button>
                              <button 
                                onClick={() => setEditingCategoryId(null)}
                                className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <span className="font-medium truncate">{c.name}</span>
                            {c.parentId && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <CornerDownRight size={10} />{" "}
                                {categories.find((p) => p.id === c.parentId)?.name}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                      <div className="flex gap-1 items-center shrink-0">
                        {editingCategoryId !== c.id && (
                          <button
                            onClick={() => {
                              setEditingCategoryId(c.id);
                              setRenameValue(c.name);
                            }}
                            className="text-slate-400 hover:text-blue-600 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit2 size={14} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteCategory(c.id)}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500">
                  <Info size={12} /> App Version: {APP_VERSION}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Install Modal */}
      {isInstallModalOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden p-6 text-center">
            <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone size={24} />
            </div>
            <h3 className="font-bold text-lg text-slate-800 mb-2">
              홈 화면에 추가하기
            </h3>
            <p className="text-slate-600 text-sm mb-6 leading-relaxed">
              브라우저 메뉴에서 <strong>'홈 화면에 추가'</strong>를 선택하면
              <br />
              앱처럼 <strong>전체 화면</strong>으로 실행됩니다.
            </p>
            <div className="space-y-3 text-left bg-slate-50 p-4 rounded-lg text-sm text-slate-700 mb-6">
              <div className="flex items-start gap-2">
                <span className="bg-slate-200 text-slate-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>
                  브라우저 하단/상단의{" "}
                  <Share size={14} className="inline mx-1" /> 공유 또는 메뉴(⋮)
                  터치
                </span>
              </div>
              <div className="flex items-start gap-2">
                <span className="bg-slate-200 text-slate-700 w-5 h-5 flex items-center justify-center rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>
                  <strong>'홈 화면에 추가'</strong> 선택
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsInstallModalOpen(false)}
              className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              확인했습니다
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
