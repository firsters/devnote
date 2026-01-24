import React, { useState, useEffect, useMemo, useRef } from "react";
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
          src: "https://cdn-icons-png.flaticon.com/512/1005/1005141.png",
          sizes: "512x512",
          type: "image/png",
          purpose: "any maskable",
        },
        {
          src: "https://cdn-icons-png.flaticon.com/192/1005/1005141.png",
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
    iconLink.href = "https://cdn-icons-png.flaticon.com/192/1005/1005141.png";
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

  return (
    <div className="bg-slate-900 text-slate-100 rounded-lg my-3 overflow-hidden border border-slate-700 shadow-sm group">
      <div className="flex justify-between items-center px-3 py-1.5 bg-slate-800 border-b border-slate-700">
        <span className="text-xs text-slate-400 font-mono">Code</span>
        <button
          onClick={handleCopy}
          className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}{" "}
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono overflow-x-auto custom-scrollbar leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const MarkdownView = ({ content, code }) => {
  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="text-sm text-slate-700 leading-7">
      {parts.map((part, index) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const cleanCode = part.replace(/^```\w*\n?/, "").replace(/```$/, "");
          return <CodeBlock key={index} code={cleanCode} />;
        } else {
          return (
            <div key={index} className="whitespace-pre-wrap mb-2">
              {part}
            </div>
          );
        }
      })}
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

const CategoryNode = ({
  category,
  depth,
  selectedId,
  expandedIds,
  onToggle,
  onSelect,
}) => {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedIds.has(category.id);
  const isSelected = selectedId === category.id;

  const getIcon = () => {
    if (category.id === "all") return <Folder size={16} />;
    if (hasChildren)
      return isExpanded ? (
        <Folder size={16} className="text-blue-500" />
      ) : (
        <Folder size={16} />
      );
    return <Hash size={16} />;
  };

  return (
    <>
      <div
        onClick={() => onSelect(category.id)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors mb-0.5
          ${isSelected ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-100"}
        `}
        style={{ paddingLeft: `${depth * 16 + 12}px` }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(category.id);
          }}
          className={`p-0.5 rounded hover:bg-black/5 ${hasChildren ? "visible" : "invisible"}`}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <span className="flex-shrink-0 opacity-70">{getIcon()}</span>
        <span className="truncate flex-1">{category.name}</span>
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

  const htmlInputRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_DATA, JSON.stringify(snippets));
  }, [snippets]);
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(categories));
  }, [categories]);

  const categoryTree = useMemo(() => {
    const tree = [];
    const map = {};
    categories.forEach((cat) => {
      map[cat.id] = { ...cat, children: [] };
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
  }, [categories]);

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
  }, [snippets, selectedCategoryId, categories, selectedTag]);

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

  const handleDeleteSnippet = (id) => {
    if (window.confirm("정말 삭제하시겠습니까?")) {
      setSnippets((prev) => prev.filter((s) => s.id !== id));
      showNotification("노트가 삭제되었습니다.");
    }
  };

  const handleAddCategory = () => {
    if (!newCatName.trim()) return;
    const newCat = {
      id: "cat_" + Date.now(),
      name: newCatName,
      parentId: newCatParentId || null,
    };
    setCategories([...categories, newCat]);
    setNewCatName("");
    showNotification("폴더가 추가되었습니다.");
  };

  const handleDeleteCategory = (id) => {
    if (window.confirm("삭제하시겠습니까? 하위 폴더는 최상위로 이동됩니다.")) {
      setCategories((prev) =>
        prev
          .filter((c) => c.id !== id)
          .map((c) => (c.parentId === id ? { ...c, parentId: null } : c)),
      );
      showNotification("삭제되었습니다.");
    }
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

  const handleHtmlImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(event.target.result, "text/html");
        const content = doc.body.innerText.trim();
        setSnippets((prev) => [
          {
            id: Date.now().toString(),
            title: `[Import] ${file.name}`,
            category: "미분류",
            content: content,
            code: "",
            createdAt: new Date().toISOString(),
          },
          ...prev,
        ]);
        showNotification("파일을 불러왔습니다.");
      } catch (err) {
        showNotification("오류가 발생했습니다.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 safe-area-inset-top">
      {notification && (
        <div className="fixed top-4 right-4 z-[100] px-4 py-3 rounded-lg shadow-lg text-white text-sm font-medium bg-slate-800 animate-fade-in-down">
          {notification}
        </div>
      )}

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
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer mb-1 ${selectedCategoryId === "all" && !selectedTag ? "bg-blue-100 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Folder size={16} /> <span>전체 보기</span>
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
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg text-left"
            >
              <Download size={16} className="text-slate-500" /> HTML 파일
              가져오기
            </button>
            <input
              type="file"
              ref={htmlInputRef}
              onChange={handleHtmlImport}
              accept=".html,.htm"
              className="hidden"
            />
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
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              className="w-full bg-slate-100 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="검색..."
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredSnippets.length > 0 ? (
              filteredSnippets.map((snippet) => (
                <div
                  key={snippet.id}
                  className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600 mb-1">
                        <Folder size={10} /> {snippet.category}
                      </span>
                      <h3 className="text-lg font-bold text-slate-800">
                        {snippet.title}
                      </h3>
                      {snippet.tags && snippet.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => openWriteModal(snippet)}
                        className="text-slate-400 hover:text-blue-600"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteSnippet(snippet.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <MarkdownView
                      content={snippet.content}
                      code={snippet.code}
                    />
                  </div>
                </div>
              ))
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
                      className="flex justify-between items-center p-2 border rounded bg-slate-50 text-sm"
                    >
                      <div className="flex flex-col">
                        <span>{c.name}</span>
                        {c.parentId && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <CornerDownRight size={10} />{" "}
                            {categories.find((p) => p.id === c.parentId)?.name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(c.id)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 size={14} />
                      </button>
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
