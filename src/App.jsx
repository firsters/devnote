import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRegisterSW } from 'virtual:pwa-register/react';
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import "katex/dist/katex.min.css";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import * as mammoth from "mammoth";
import * as pdfjs from "pdfjs-dist";
import { GoogleGenerativeAI } from "@google/generative-ai";

// PDF.js worker setup
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

import {
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
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
  FolderPlus,
  FilePlus,
  Sparkles,
  Loader2,
  Camera,
  Image as ImageIcon,
} from "lucide-react";

// -----------------------------------------------------------------------------
// 앱 버전 및 설정
// -----------------------------------------------------------------------------
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : "v1.1.dev-local";
const STORAGE_KEY_DATA = "devnote_data_v11";
const STORAGE_KEY_CATS = "devnote_cats_v11";
const STORAGE_KEY_VIEW_MODE = "devnote_view_mode_v11";
const STORAGE_KEY_LAST_VERSION = "devnote_last_version";
const APP_TITLE = "DevNote";

// Google Gemini AI Setup
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = GEMINI_API_KEY && GEMINI_API_KEY !== "YOUR_GEMINI_API_KEY_HERE" 
  ? new GoogleGenerativeAI(GEMINI_API_KEY) 
  : null;

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

**신규 기능: LaTeX 수식 지원**
- 이제 \`$E = mc^2$\` 와 같이 수식을 입력할 수 있습니다.

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

    // 4. 아이콘 링크 주입 (iOS용)
    let iconLink = document.querySelector('link[rel="apple-touch-icon"]');
    if (!iconLink) {
      iconLink = document.createElement("link");
      iconLink.rel = "apple-touch-icon";
      document.head.appendChild(iconLink);
    }
    iconLink.href = "/logo.png";
    
    // 5. orientation unlock
    if (screen.orientation && screen.orientation.unlock) {
      try {
        screen.orientation.unlock();
      } catch (e) {
        console.error("Orientation unlock failed:", e);
      }
    }
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
          <code className="block whitespace-pre-wrap break-all">{code}</code>
        </pre>
      </div>
    </div>
  );
};

const MarkdownView = ({ content, code }) => {
  if (!content) return null;

  return (
    <div className="devnote-markdown">
      <style>{`
        .devnote-markdown table { border-collapse: collapse; width: 100%; margin: 1em 0; }
        .devnote-markdown th, .devnote-markdown td { border: 1px solid #dfe1e6; padding: 8px 12px; text-align: left; }
        .devnote-markdown th { background-color: #f4f5f7; font-weight: bold; }
        .devnote-markdown tr:nth-child(even) { background-color: #f9f9fb; }
        .devnote-markdown blockquote[data-label] { margin: 1em 0; border-left: 4px solid #4c9aff; padding-left: 1em; color: #172b4d; }
        .devnote-markdown .inline-code {
          background-color: #f0f2f5;
          color: #e03131;
          padding: 0.2em 0.4em;
          border-radius: 4px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: 0.9em;
          font-weight: 500;
        }
      `}</style>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeRaw]}
        components={{
          code({ node, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            const codeContent = String(children).replace(/\n$/, "");
            
            // react-markdown v9+ compatibility: inline prop is gone.
            // Distinguish by: 1) Has language- class, 2) has internal newlines, or 3) is child of PRE
            const isBlock = match || codeContent.includes("\n") || (node?.tagName === "code" && node?.parent?.tagName === "pre");

            if (isBlock) {
              return <CodeBlock code={codeContent} />;
            }
            return (
              <code className={`${className || ""} inline-code`} {...props}>
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

const ConfirmDialog = ({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  type = "danger",
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-zoom-in">
        <div className="p-6 text-center">
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${type === "danger" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}
          >
            {type === "danger" ? <Trash2 size={24} /> : <Info size={24} />}
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
            className={`flex-1 px-4 py-3 text-sm font-bold transition-colors ${type === "danger" ? "text-red-600 hover:bg-red-50" : "text-blue-600 hover:bg-blue-50"}`}
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
  onAddSubCategory,
  onAddNote,
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
        className={
          isSelected || isExpanded ? "text-blue-500" : "text-slate-400"
        }
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
          <div
            className="flex-1 flex gap-1 pr-1"
            onClick={(e) => e.stopPropagation()}
          >
            <input
              className="flex-1 border border-blue-400 p-0.5 rounded text-xs outline-none bg-white font-normal"
              value={renameValue}
              onChange={(e) => onRenameValueChange(e.target.value)}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onEditSave(category.id);
                if (e.key === "Escape") onEditCancel();
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
                  onAddNote(category.id);
                }}
                className="text-slate-400 hover:text-green-600 p-1"
                title="새 노트 작성"
              >
                <FilePlus size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onAddSubCategory(category.id);
                }}
                className="text-slate-400 hover:text-blue-600 p-1"
                title="하위 폴더 추가"
              >
                <FolderPlus size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditStart(category.id, category.name);
                }}
                className="text-slate-400 hover:text-blue-600 p-1"
                title="폴더 이름 변경"
              >
                <Edit2 size={12} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(category.id);
                }}
                className="text-slate-400 hover:text-red-500 p-1"
                title="폴더 삭제"
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
            onAddSubCategory={onAddSubCategory}
            onAddNote={onAddNote}
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

  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        // Poll for updates every 5 minutes
        setInterval(() => {
          r.update();
        }, 5 * 60 * 1000);
      }
      console.log('SW Registered');
    },
    onRegisterError(error) {
      console.error('SW registration error', error);
    },
  });

  // Proactive SW update check on window focus
  useEffect(() => {
    const handleFocus = () => {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then(registration => {
          registration.update();
        });
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

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
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
  });
  const [isRotated, setIsRotated] = useState(false);

  // Category Rename States
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isOcrLoading, setIsOcrLoading] = useState(false);

  const [user, setUser] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const htmlInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const hasFetchedRef = useRef(false);
  const notificationTimeoutRef = useRef(null);
  const turndownRef = useRef(
    (() => {
      const service = new TurndownService({
        headingStyle: "atx",
        codeBlockStyle: "fenced",
        hr: "---",
        bulletListMarker: "-",
        preformattedCode: false, // Prevent <pre> without code tags from becoming code blocks automatically
      });
      // CRITICAL: Disable indentation-based code blocks to prevent random text from becoming code
      service.remove("indentedCodeBlock");
      service.use(gfm);

      // 1. Remove line numbers from Confluence code blocks
      service.addRule("confluence-line-numbers", {
        filter: (node) =>
          (node.nodeName === "TD" &&
            (node.classList.contains("line-number") ||
              node.classList.contains("rd-line-number"))) ||
          (node.nodeName === "DIV" &&
            (node.classList.contains("line-numbers") ||
              node.classList.contains("gutter"))),
        replacement: () => "",
      });

      service.addRule("confluence-code-macro", {
        filter: (node) => {
          const isConfluenceDiv = (node.nodeName === "DIV" &&
            (node.getAttribute("data-macro-name") === "code" ||
              node.classList.contains("code-content") ||
              node.classList.contains("code-block")));
          
          const isConfluencePre = (node.nodeName === "PRE" &&
            (node.classList.contains("syntaxhighlighter-pre") ||
              node.classList.contains("syntaxhighlighter") ||
              node.classList.contains("code")));

          // CRITICAL: Gemini uses 'code-block' or 'code' classes on DIVs.
          // We must check for Confluence-specific attributes or exclude Gemini's wrappers.
          const isGeminiWrapper = node.querySelector('.m-code, .code-block-header, button');
          
          return (isConfluenceDiv || isConfluencePre) && !isGeminiWrapper;
        },
        replacement: (content, node) => {
          // Robust recursive text extraction to preserve line breaks
          const extractText = (el) => {
            let text = "";
            for (let i = 0; i < el.childNodes.length; i++) {
              const child = el.childNodes[i];

              // Skip line numbers inside code macro (Confluence specific)
              if (child.nodeType === 1) {
                const className = child.className || "";
                const isLineNum =
                  (child.nodeName === "TD" &&
                    (className.includes("line-number") ||
                      className.includes("rd-line-number"))) ||
                  (child.nodeName === "DIV" &&
                    (className.includes("line-numbers") ||
                      className.includes("gutter")));
                if (isLineNum) continue;
              }

              if (child.nodeType === 3) {
                // Text node
                text += child.textContent;
              } else if (child.nodeType === 1) {
                // Element node
                const tag = child.nodeName.toUpperCase();

                if (tag === "BR") {
                  text += "\n";
                  continue;
                }

                const isBlock =
                  [
                    "DIV",
                    "P",
                    "TR",
                    "LI",
                    "TD",
                    "TH",
                    "PRE",
                    "H1",
                    "H2",
                    "H3",
                  ].includes(tag) ||
                  child.classList.contains("line") ||
                  child.classList.contains("code-line") ||
                  child.classList.contains("syntaxhighlighter-line");

                const childContent = extractText(child);

                if (isBlock) {
                  // Only add prefix newline if there is already text and it doesn't end with a newline
                  if (text && !text.endsWith("\n")) text += "\n";
                  text += childContent;
                } else {
                  text += childContent;
                }
              }
            }
            return text;
          };

          const rawCode = extractText(node);
          const cleanCode = rawCode
            .replace(/\r/g, "")
            .replace(/\\n/g, "\n")
            .trim();
          if (!cleanCode) return "";

          // Final Smart Distinction:
          // ONLY use block (triple backticks) if there's a real vertical break (newline)
          const hasNewLine = cleanCode.includes("\n");
          if (!hasNewLine && cleanCode.length < 200) {
            return `\`${cleanCode}\``;
          }

          return `\n\n\`\`\`\n${cleanCode}\n\`\`\`\n\n`;
        },
      });

      // 3. Improve inline code merging (Greedy search for mono fonts and backgrounds)
      service.addRule("confluence-inline-code", {
        filter: (node) =>
          ["code", "tt", "kbd", "samp"].includes(node.nodeName.toLowerCase()) ||
          (node.nodeName === "SPAN" &&
            (node.classList.contains("code") ||
              node.classList.contains("monospace") ||
              node.style.fontFamily?.toLowerCase().includes("mono") ||
              node.style.backgroundColor === "rgb(244, 245, 247)" ||
              node.style.backgroundColor === "rgb(241, 242, 244)" ||
              node.style.backgroundColor === "rgb(238, 238, 238)" ||
              node.style.backgroundColor === "#f4f5f7" ||
              node.style.backgroundColor === "#eeeeee" ||
              node.style.backgroundColor ===
                "var(--ds-background-neutral-subtle, #F4F5F7)" ||
              (node.getAttribute("style")?.includes("background-color") &&
                (node.getAttribute("style").includes("#f4f5f7") ||
                  node.getAttribute("style").includes("#eeeeee") ||
                  node.getAttribute("style").includes("rgb(244, 245, 247)"))))),
        replacement: (content) => {
          const cleanContent = content.trim();
          if (!cleanContent) return "";
          return `\`${cleanContent.replace(/`/g, "\\`")}\``;
        },
      });

      // 5. Cleanup inside preserved table cells (Strip restrictive styles and flatten)
      service.addRule("clean-confluence-tables", {
        filter: [
          "table",
          "thead",
          "tbody",
          "tr",
          "th",
          "td",
          "colgroup",
          "col",
        ],
        replacement: (content, node) => {
          const tag = node.nodeName.toLowerCase();
          // Stop collapsing newlines in cells to allow code blocks and preserved formatting
          let cleanContent = content;

          // Remove literal ** markers as CSS already handles the bolding for TH
          if (tag === "th" || tag === "td") {
            cleanContent = cleanContent.replace(/\*\*/g, "").replace(/__/g, "");
          }

          // Return raw tag with essential attributes only
          if (tag === "table")
            return `\n\n<table class="confluenceTable">${cleanContent}</table>\n\n`;
          return `<${tag}>${cleanContent}</${tag}>`;
        },
      });

      // 6. Confluence Task List
      service.addRule("confluence-tasks", {
        filter: (node) =>
          node.nodeName === "LI" && node.classList.contains("task-list-item"),
        replacement: (content, node) => {
          const checked = node.querySelector('input[type="checkbox"]')?.checked;
          // Use 'content' (processed markdown) instead of raw textContent to preserve inline styles
          return `- [${checked ? "x" : " "}] ${content.trim()}\n`;
        },
      });

      service.addRule("confluence-headers", {
        filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
        replacement: (content, node) => {
          const hLevel = Number(node.nodeName.charAt(1));
          const prefix = "#".repeat(hLevel);
          // Use 'content' (processed markdown) to preserve inner styles like bold/code
          return `\n\n${prefix} ${content.trim()}\n\n`;
        },
      });

      // 5. Clean up extra wrappers often found in Confluence
      service.addRule("confluence-wrappers", {
        filter: (node) =>
          (node.nodeName === "DIV" &&
            (node.classList.contains("content-wrapper") ||
              node.classList.contains("innerCell") ||
              node.classList.contains("code-block-header") ||
              node.classList.contains("m-code") ||
              node.classList.contains("highlight") ||
              node.style.display === "inline" ||
              node.style.display === "contents")) ||
          (node.nodeName === "SPAN" &&
            (node.classList.contains("confluence-anchor-link") ||
              node.style.display === "block" === false)),
        replacement: (content) => content,
      });

      // 7. Flatten paragraphs/divs that only contain inline elements or single line
      service.addRule("inline-wrappers", {
        filter: (node) => 
          (node.nodeName === "P" || node.nodeName === "DIV") && 
          node.childNodes.length === 1 && 
          ["CODE", "SPAN", "B", "I", "STRONG", "EM", "A"].includes(node.childNodes[0].nodeName),
        replacement: (content) => content
      });

      // 6. Remove junk tags
      service.addRule("remove-junk", {
        filter: ["style", "script", "noscript", "meta", "button", "svg", "path"],
        replacement: () => "",
      });

      return service;
    })(),
  );

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
    md = md.replace(
      /\{code(?::\w+)?\}([\s\S]*?)\{code\}/g,
      "\n\n```\n$1\n```\n\n",
    );

    // No-format: {noformat}...{noformat} -> ```...```
    md = md.replace(
      /\{noformat\}([\s\S]*?)\{noformat\}/g,
      "\n\n```\n$1\n```\n\n",
    );

    // Monospaced text (Confluence specific): {{text}} -> `text`
    md = md.replace(/\{\{([^\}]+)\}\}/g, "`$1`");

    // Panels/Info/Success blocks (Simplified)
    md = md.replace(/\{panel:?[^\}]*\}([\s\S]*?)\{panel\}/g, "> $1");
    md = md.replace(/\{info:?[^\}]*\}([\s\S]*?)\{info\}/g, "> [!NOTE]\n> $1");
    md = md.replace(
      /\{note:?[^\}]*\}([\s\S]*?)\{note\}/g,
      "> [!IMPORTANT]\n> $1",
    );

    // Lists: # item -> 1. item, * item -> - item
    md = md.replace(/^\#\s+/gm, "1. ");

    // Tables (Strict Confluence Wiki conversion)
    // 1. Headers: ||header1||header2||
    md = md.replace(/^\|\|(.*)\|\|$/gm, (match, content) => {
      const cols = content.split("||").filter((c) => c !== "");
      const header = "| " + cols.map((c) => c.trim()).join(" | ") + " |";
      const separator = "| " + cols.map(() => "---").join(" | ") + " |";
      return "\n" + header + "\n" + separator;
    });

    // 2. Rows: |cell1|cell2|
    md = md.replace(/^\|(.*)\|$/gm, (match, content) => {
      // Skip if it looks like a separator (already converted header)
      if (content.includes("---")) return match;
      const cols = content.split("|").filter((c) => c !== "");
      if (cols.length === 0) return "";
      return "| " + cols.map((c) => c.trim()).join(" | ") + " |";
    });

    return md;
  };

  const handlePaste = (e) => {
    const html = e.clipboardData.getData("text/html");
    const plainText = e.clipboardData.getData("text/plain");

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

  useEffect(() => {
    if (offlineReady) {
      showNotification("오프라인 모드 준비 완료!");
      setOfflineReady(false);
    }
  }, [offlineReady]);

  useEffect(() => {
    if (needRefresh) {
      showNotification("새로운 버전이 발견되었습니다. 업데이트를 반영합니다...");
      // Forcing update and reload
      setTimeout(() => {
        updateServiceWorker(true);
      }, 1500);
    }
  }, [needRefresh]);

  // Initial SW update check on mount
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.update().catch(err => console.error("SW manual update failed:", err));
      });
    }
  }, []);

  // Check for app version update
  useEffect(() => {
    const lastVersion = localStorage.getItem(STORAGE_KEY_LAST_VERSION);
    if (lastVersion && lastVersion !== APP_VERSION) {
      // Show sticky notification for version update
      showNotification(`🚀 최신 버전으로 업데이트되었습니다!\n${APP_VERSION}`, { sticky: true });
    }
    localStorage.setItem(STORAGE_KEY_LAST_VERSION, APP_VERSION);
  }, []);

  // Handles redirect result on page load
  useEffect(() => {
    if (!auth) return;
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Redirect login successful:", result.user.displayName);
          showNotification(
            `${result.user.displayName}님, 환영합니다! (Redirect)`,
          );
        }
      })
      .catch((error) => {
        console.error("Redirect login error:", error);
        if (error.code !== "auth/web-storage-unsupported") {
          showNotification(`로그인 오류: ${error.message}`);
        }
      });
  }, []);

  // Firebase Auth Observer
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // notification is handled in getRedirectResult if it was a redirect
        // or here for normal initial load/refresh
        console.log(
          "Auth state changed: logged in as",
          currentUser.displayName,
        );
      }
    });
    return () => unsubscribe();
  }, []);

  // 5. Handle Web Share Target
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("share") === "true") {
      const sharedTitle = params.get("title") || "";
      const text = params.get("text") || "";
      const url = params.get("url") || "";

      let content = text;
      if (url) {
        content = (content ? content + "\n\n" : "") + url;
      }

      if (sharedTitle || content) {
        // 1. Find or create "임시" category at root level
        let tempCat = categories.find(c => c.name === "임시" && c.parentId === null);
        let finalCategories = categories;
        
        if (!tempCat) {
          tempCat = { id: "cat_temp_" + Date.now(), name: "임시", parentId: null };
          finalCategories = [...categories, tempCat];
          setCategories(finalCategories);
        }

        // 2. Auto-generate title if shared title is empty
        let finalTitle = sharedTitle;
        if (!finalTitle && content) {
          const firstLine = content.split('\n')[0].trim();
          finalTitle = firstLine.length > 30 ? firstLine.substring(0, 30) + "..." : firstLine;
          if (!finalTitle) finalTitle = "공유된 노트 " + new Date().toLocaleString();
        }

        // 3. Create and save snippet automatically
        const newSnippet = {
          id: Date.now().toString(),
          title: finalTitle,
          content: content,
          category: tempCat.name,
          createdAt: new Date().toISOString(),
          tags: ["shared"],
          code: "",
        };

        setSnippets(prev => [newSnippet, ...prev]);
        setSelectedCategoryId(tempCat.id);
        setSelectedTag(null);

        // Clean URL to prevent multiple triggers on reload
        const newUrl = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, newUrl);

        showNotification(`"임시" 폴더에 새로운 노트가 저장되었습니다.`);
      }
    }
  }, [categories, selectedCategoryId]); // categories updated within the hook is fine as long as we only act on 'share=true'

  // Sync with Firestore (Push local data to cloud when logged in)
  useEffect(() => {
    const syncToCloud = async () => {
      if (user && db) {
        setIsSyncing(true);
        try {
          console.log("Cloud sync started for user:", user.uid);
          await setDoc(
            doc(db, "users", user.uid),
            {
              snippets: snippets,
              categories: categories,
              lastSynced: new Date().toISOString(),
            },
            { merge: true },
          );
          console.log("Cloud sync successful");
        } catch (error) {
          console.error("Cloud sync failed:", error);
          showNotification(
            `동기화 실패: ${error.message} (권한 설정을 확인하세요)`,
          );
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
      if (user && db && !hasFetchedRef.current) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            const cloudData = docSnap.data();
            if (cloudData.snippets) setSnippets(cloudData.snippets);
            if (cloudData.categories) setCategories(cloudData.categories);
            showNotification("클라우드 데이터를 불러왔습니다.");
            hasFetchedRef.current = true;
          }
        } catch (error) {
          console.error("Failed to fetch cloud data:", error);
        }
      } else if (!user) {
        hasFetchedRef.current = false; // Reset if user logs out
      }
    };
    fetchFromCloud();
  }, [user]);

  const noteCounts = useMemo(() => {
    // 1. Direct counts (by category name - case-insensitive)
    const directCounts = {};
    snippets.forEach((s) => {
      const catName = (s.category || "").toLowerCase().trim() || "미분류";
      directCounts[catName] = (directCounts[catName] || 0) + 1;
    });

    // 2. Aggregate counts (hierarchical) using IDs
    const totalsById = {};

    const getAggregateCount = (catId, stack = new Set()) => {
      if (totalsById[catId] !== undefined) return totalsById[catId];
      if (stack.has(catId)) return 0;

      const cat = categories.find((c) => c.id === catId);
      if (!cat) return 0;

      const newStack = new Set(stack);
      newStack.add(catId);

      // Direct count for this category name
      const searchName = (cat.name || "").toLowerCase().trim();
      let count = directCounts[searchName] || 0;

      // Add counts from subcategories
      const subCats = categories.filter((c) => c.parentId === catId);
      subCats.forEach((child) => {
        count += getAggregateCount(child.id, newStack);
      });

      totalsById[catId] = count;
      return count;
    };

    // Calculate totals for all categories
    const finalCounts = {};
    categories.forEach((cat) => {
      if (cat.id !== "all") {
        const total = getAggregateCount(cat.id);
        finalCounts[cat.id] = total;
        // Keep name-based for backward compatibility with old snippets category strings
        const nameKey = (cat.name || "").toLowerCase().trim();
        if (finalCounts[nameKey] === undefined) {
          finalCounts[nameKey] = total;
        }
      }
    });

    return finalCounts;
  }, [snippets, categories]);

  const categoryTree = useMemo(() => {
    const tree = [];
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = {
        ...cat,
        children: [],
        totalCount: noteCounts[cat.id] ?? noteCounts[cat.name] ?? 0,
      };
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
      return result.filter(
        (s) =>
          (s.title || "").toLowerCase().includes(q) ||
          (s.content || "").toLowerCase().includes(q) ||
          (s.tags && s.tags.some((t) => t.toLowerCase().includes(q))),
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

  const showNotification = (text, options = {}) => {
    const { sticky = false, duration = 3000 } = options;
    
    // Clear any existing timeout to prevent overlapping notifications from clearing each other
    if (notificationTimeoutRef.current) {
      clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = null;
    }

    setNotification({ text, sticky });

    if (!sticky) {
      notificationTimeoutRef.current = setTimeout(() => {
        setNotification(null);
        notificationTimeoutRef.current = null;
      }, duration);
    }
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

  const closeConfirm = () =>
    setConfirmDialog({ ...confirmDialog, open: false });

  const handleDeleteSnippet = (id) => {
    setConfirmDialog({
      open: true,
      title: "노트 삭제",
      message:
        "이 노트를 정말 삭제하시겠습니까? 삭제된 내용은 복구할 수 없습니다.",
      type: "danger",
      onConfirm: () => {
        setSnippets((prev) => prev.filter((s) => s.id !== id));
        showNotification("노트가 삭제되었습니다.");
        closeConfirm();
      },
      onCancel: closeConfirm,
    });
  };

  const handleAddCategory = () => {
    const trimmedName = newCatName.trim();
    if (!trimmedName) return;

    // Duplicate check
    if (
      categories.some((c) => c.name.toLowerCase() === trimmedName.toLowerCase())
    ) {
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

    const targetCat = categories.find((c) => c.id === id);
    if (!targetCat) return;

    if (targetCat.name === trimmedName) {
      setEditingCategoryId(null);
      return;
    }

    // Duplicate check
    if (
      categories.some(
        (c) =>
          c.id !== id && c.name.toLowerCase() === trimmedName.toLowerCase(),
      )
    ) {
      showNotification("이미 존재하는 폴더 이름입니다.");
      return;
    }

    const oldName = targetCat.name;

    // Update snippets
    setSnippets((prev) =>
      prev.map((s) =>
        s.category === oldName ? { ...s, category: trimmedName } : s,
      ),
    );

    // Update category
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: trimmedName } : c)),
    );

    setEditingCategoryId(null);
    showNotification("폴더 이름이 변경되었습니다.");
  };

  const handleDeleteCategory = (id) => {
    setConfirmDialog({
      open: true,
      title: "폴더 삭제",
      message:
        "폴더를 삭제하시겠습니까? 하위 폴더와 노트는 최상위로 이동됩니다.",
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
      onCancel: closeConfirm,
    });
  };

  const openWriteModal = (snippet = null, categoryId = null) => {
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
        categoryId ||
          (selectedCategoryId === "all"
            ? categories[1].id
            : selectedCategoryId),
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

  const handleAutoGenerateTitle = async (force = false) => {
    if (isGeneratingTitle) return;
    if (!formContent.trim()) return;
    if (!force && formTitle.trim()) return; // Don't overwrite if manual and title already exists, unless forced

    if (!genAI) {
      console.warn("Gemini API key is missing. Auto-titling disabled.");
      if (force) showNotification("AI 설정을 위해 .env 파일에 API 키를 입력해주세요.");
      return;
    }

    setIsGeneratingTitle(true);
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      const prompt = `Analyze the following developer note content and provide a very concise, descriptive title (under 30 characters). Return ONLY the plain text title without any symbols or formatting.
      
Content:
${formContent.substring(0, 2000)}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      if (text) {
        setFormTitle(text);
        showNotification("AI가 제목을 생성했습니다.");
      }
    } catch (error) {
      console.error("AI Title Generation failed:", error);
      if (force) showNotification("제목 생성 중 오류가 발생했습니다.");
    } finally {
      setIsGeneratingTitle(false);
    }
  };

  const handleProcessOcr = async (file) => {
    if (!file || isOcrLoading) return;
    
    if (!genAI) {
      showNotification("AI 설정을 위해 .env 파일에 API 키를 입력해주세요.");
      return;
    }

    setIsOcrLoading(true);
    showNotification("이미지에서 텍스트를 추출하는 중...");

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
      
      // Convert file to base64 with robust error handling
      const base64Data = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            if (base64) resolve(base64);
            else reject(new Error("Empty base64 data"));
          } else {
            reject(new Error("Invalid reader result type"));
          }
        };
        reader.onerror = () => reject(new Error("파일을 읽는 중 오류가 발생했습니다."));
        reader.onabort = () => reject(new Error("파일 읽기가 중단되었습니다."));
        reader.readAsDataURL(file);
      });

      const prompt = "Please extract all text from this image and return it accurately. Do not include any explanations or metadata, just the extracted text.";

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: base64Data,
            mimeType: file.type || "image/jpeg"
          }
        }
      ]);

      const response = await result.response;
      const text = response.text().trim();

      if (text) {
        setFormContent(prev => (prev ? prev + "\n" + text : text));
        showNotification("텍스트 추출 완료!");
        
        if (!formTitle.trim()) {
           setTimeout(() => handleAutoGenerateTitle(false), 500);
        }
      } else {
        showNotification("이미지에서 텍스트를 인식하지 못했습니다.", { sticky: true });
      }
    } catch (error) {
      console.error("OCR failed:", error);
      showNotification(`추출 실패: ${error.message || "알 수 없는 오류"}`, { sticky: true });
    } finally {
      setIsOcrLoading(false);
    }
  };

  const handleFileImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop().toLowerCase();

    try {
      showNotification(`${file.name} 파일을 읽는 중...`);
      let content = "";

      if (fileExtension === "html" || fileExtension === "htm") {
        const text = await file.text();
        // Use turndown for better markdown conversion
        content = turndownRef.current.turndown(text);
      } else if (fileExtension === "docx") {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        content = turndownRef.current.turndown(result.value);
      } else if (fileExtension === "pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item) => item.str).join(" ");
          fullText += pageText + "\n\n";
        }
        content = fullText.trim();
      } else {
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

  const handleLogin = async (useRedirect = false) => {
    if (!auth || !googleProvider) {
      showNotification(
        "Firebase 설정이 필요합니다. firebase.js를 확인해 주세요.",
      );
      return;
    }

    try {
      if (useRedirect) {
        showNotification("로그인 페이지로 이동합니다...");
        await signInWithRedirect(auth, googleProvider);
      } else {
        showNotification("로그인을 진행 중입니다...");
        await signInWithPopup(auth, googleProvider);
        showNotification("로그인 되었습니다.");
      }
    } catch (error) {
      console.error("Login failed:", error);
      let msg = "로그인에 실패했습니다.";

      if (error.code === "auth/popup-closed-by-user") {
        msg = "로그인 창이 닫혔습니다.";
      } else if (error.code === "auth/cancelled-popup-request") {
        msg = "이전 로그인 요청이 취소되었습니다. 다시 시도해 주세요.";
      } else if (error.code === "auth/popup-blocked") {
        msg =
          "브라우저에서 팝업이 차단되었습니다. 설정을 확인하거나 아래 버튼을 눌러보세요.";
      } else if (error.code === "auth/unauthorized-domain") {
        msg = "승인되지 않은 도메인입니다. Firebase 콘솔 설정을 확인하세요.";
      } else {
        msg += ` [${error.code}] ${error.message}`;
      }

      showNotification(msg);

      // If popup fails with blocked error, we could offer redirect automatically or via another button
      console.warn(
        "Hint: If popups are failing, try signInWithRedirect(auth, googleProvider)",
      );
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

  const handleShareLink = async () => {
    const shareData = {
      title: "DevNote - 모바일 노트를 위한 가장 빠른 도구",
      text: "DevNote를 설치하고 편리하게 개발 노트를 작성해보세요!",
      url: window.location.origin
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        showNotification("성공적으로 공유했습니다.");
      } catch (error) {
        if (error.name !== "AbortError") {
          console.error("Link share failed:", error);
          showNotification("공속 실패: " + error.message);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.origin);
        showNotification("설치 링크가 클립보드에 복사되었습니다.\n이제 원하는 곳에 붙여넣으세요!");
      } catch (err) {
        console.error("Clipboard fallback failed:", err);
        showNotification("링크 복사에 실패했습니다.");
      }
    }
  };

  return (
    <div className={`flex h-full bg-slate-50 font-sans text-slate-900 safe-area-inset-top transition-transform duration-300 ${isRotated ? "rotate-90 origin-top-left fixed top-0 left-full w-[100vh] h-[100vw]" : "w-full"}`}>
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[110] px-6 py-3 rounded-2xl shadow-2xl text-white text-sm font-bold bg-slate-800/90 backdrop-blur border border-slate-700 flex items-center gap-4 animate-fade-in-down whitespace-pre-line text-center min-w-[280px] justify-center max-w-[90vw]">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse shrink-0" />
          <div className="flex-1">
            {typeof notification === "object" ? notification.text : notification}
          </div>
          {notification.sticky && (
            <button
              onClick={() => setNotification(null)}
              className="ml-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs transition-colors shadow-lg border border-blue-400/30 whitespace-nowrap"
            >
              확인
            </button>
          )}
        </div>
      )}

      {isSyncing && (
        <div className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 bg-white/80 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-[10px] font-bold text-slate-500 animate-fade-in">
          <RefreshCw size={12} className="animate-spin text-blue-500" />
          Cloud Syncing...
        </div>
      )}

      <ConfirmDialog
        {...confirmDialog}
        onCancel={confirmDialog.onCancel || closeConfirm}
      />

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
              onClick={() => {
                setNewCatParentId("");
                setIsCategoryModalOpen(true);
              }}
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
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setNewCatParentId("");
                  setIsCategoryModalOpen(true);
                }}
                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded transition-colors"
                title="새 폴더 추가"
              >
                <FolderPlus size={14} />
              </button>
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
                onAddSubCategory={(id) => {
                  setNewCatParentId(id);
                  setIsCategoryModalOpen(true);
                }}
                onAddNote={(id) => openWriteModal(null, id)}
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
              onClick={handleShareLink}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 hover:text-indigo-700 rounded-lg text-left"
            >
              <Share size={16} className="text-indigo-600" /> 설치링크 보내기
            </button>
            <button
              onClick={() => htmlInputRef.current?.click()}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-left"
            >
              <Upload size={16} className="text-blue-500" /> 외부 파일 가져오기
              (PDF, Word, HTML)
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
                  <img
                    src={user.photoURL}
                    alt="profile"
                    className="w-8 h-8 rounded-full border border-slate-200"
                  />
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-bold text-slate-800 truncate">
                      {user.displayName}
                    </span>
                    <span className="text-[10px] text-slate-400 truncate">
                      {user.email}
                    </span>
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
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => handleLogin(false)}
                  className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  <Globe size={18} />
                  로그인 (구글 클라우드 백업)
                </button>
                <button
                  onClick={() => handleLogin(true)}
                  className="text-[11px] text-slate-400 hover:text-slate-600 underline underline-offset-2"
                >
                  팝업이 안 뜨나요? 화면 전환으로 로그인
                </button>
              </div>
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

      <main className="flex-1 flex flex-col h-full overflow-hidden">
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
          <div className="flex items-center gap-2 ml-4 shrink-0">
            <button
              onClick={() => setIsRotated(!isRotated)}
              className={`p-2 rounded-lg border transition-colors ${isRotated ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"}`}
              title="화면 회전 (잠금 모드 대응)"
            >
              <Smartphone size={16} className={isRotated ? "rotate-90" : ""} />
            </button>
            <button
              onClick={() =>
                setViewMode(viewMode === "compact" ? "detailed" : "compact")
              }
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors
                ${
                  viewMode === "detailed"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }
              `}
              title={
                viewMode === "compact" ? "상세 정보 표시" : "타이틀만 표시"
              }
            >
              {viewMode === "detailed" ? (
                <Layout size={14} />
              ) : (
                <Menu size={14} />
              )}
              <span className="hidden sm:inline whitespace-nowrap">
                {viewMode === "detailed" ? "상세 모드" : "목록 모드"}
              </span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredSnippets.length > 0 ? (
              filteredSnippets.map((snippet) => {
                const isExpanded =
                  viewMode === "detailed" || expandedSnippetIds.has(snippet.id);

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
                          {viewMode === "compact" && (
                            <div
                              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                            >
                              <ChevronDown
                                size={14}
                                className="text-slate-400"
                              />
                            </div>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-slate-800 truncate">
                          {snippet.title}
                        </h3>
                        {snippet.tags && snippet.tags.length > 0 && (
                          <div
                            className="flex flex-wrap gap-1 mt-1.5 focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          >
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
                      <div
                        className="flex gap-2 ml-4"
                        onClick={(e) => e.stopPropagation()}
                      >
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
              <div className="relative">
                <input
                  className="w-full p-3 pr-10 border border-slate-300 rounded-lg outline-none focus:border-blue-500 text-lg font-bold"
                  placeholder="제목"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                />
                <button
                  onClick={() => handleAutoGenerateTitle(true)}
                  disabled={isGeneratingTitle || !formContent.trim()}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full transition-all
                    ${isGeneratingTitle 
                      ? 'bg-slate-100 text-slate-400' 
                      : (formContent.trim() ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'text-slate-300')}
                  `}
                  title="AI 제목 자동 생성"
                >
                  {isGeneratingTitle ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                </button>
              </div>
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
                  <div className="flex items-center gap-2">
                    <label className="block text-xs font-bold text-slate-500">
                      내용 (Markdown & Code)
                    </label>
                    <div className="flex gap-1">
                      <button
                        onClick={() => cameraInputRef.current?.click()}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="카메라로 텍스트 스캔"
                        disabled={isOcrLoading}
                      >
                        <Camera size={14} />
                      </button>
                      <button
                        onClick={() => imageInputRef.current?.click()}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="이미지에서 텍스트 추출"
                        disabled={isOcrLoading}
                      >
                        <ImageIcon size={14} />
                      </button>
                      <input 
                        type="file" 
                        ref={cameraInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        capture="environment"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleProcessOcr(file);
                          e.target.value = '';
                        }}
                      />
                      <input 
                        type="file" 
                        ref={imageInputRef} 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) handleProcessOcr(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                    Tip: 코드 복붙 시 ``` 로 감싸세요
                  </span>
                </div>
                <div className="relative flex-1">
                  <textarea
                    className={`w-full h-full p-3 border border-slate-300 rounded-lg outline-none focus:border-blue-500 resize-none font-sans leading-relaxed ${isOcrLoading ? 'opacity-50 pointer-events-none' : ''}`}
                    placeholder={`내용 입력...\n\n\`\`\`javascript\nconsole.log("Hello");\n\`\`\``}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    onPaste={handlePaste}
                    onBlur={() =>
                      !formTitle.trim() && handleAutoGenerateTitle(false)
                    }
                  />
                  {isOcrLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 size={24} className="animate-spin text-blue-600" />
                        <span className="text-xs font-bold text-blue-600">추출 중...</span>
                      </div>
                    </div>
                  )}
                </div>
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
                                if (e.key === "Enter")
                                  handleRenameCategory(c.id);
                                if (e.key === "Escape")
                                  setEditingCategoryId(null);
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
                            <span className="font-medium truncate">
                              {c.name}
                            </span>
                            {c.parentId && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                <CornerDownRight size={10} />{" "}
                                {
                                  categories.find((p) => p.id === c.parentId)
                                    ?.name
                                }
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
