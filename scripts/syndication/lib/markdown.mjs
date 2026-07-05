// Minimal Markdown -> HTML for spoke channels (WordPress content field).
// Intentionally small and dependency-free; replace with `marked`/`remark` if
// richer rendering is needed. Handles: headings, paragraphs, unordered/ordered
// lists, blockquotes, bold/italic/code, links, images, horizontal rules.

function inline(text) {
  return text
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

export function markdownToHtml(md) {
  const lines = String(md ?? "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let para = [];
  let list = null; // {type:'ul'|'ol', items:[]}

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join(" ").trim())}</p>`);
      para = [];
    }
  };
  const flushList = () => {
    if (list) {
      const inner = list.items.map((it) => `<li>${inline(it)}</li>`).join("");
      out.push(`<${list.type}>${inner}</${list.type}>`);
      list = null;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, "");
    if (!line.trim()) { flushPara(); flushList(); continue; }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) { flushPara(); flushList(); out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); continue; }

    if (/^(---|\*\*\*|___)\s*$/.test(line)) { flushPara(); flushList(); out.push("<hr/>"); continue; }

    if (/^>\s?/.test(line)) {
      flushPara(); flushList();
      out.push(`<blockquote>${inline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }

    const ul = line.match(/^[-*]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const type = ul ? "ul" : "ol";
      if (!list || list.type !== type) { flushList(); list = { type, items: [] }; }
      list.items.push((ul ? ul[1] : ol[1]));
      continue;
    }

    flushList();
    para.push(line.trim());
  }
  flushPara();
  flushList();
  return out.join("\n");
}
