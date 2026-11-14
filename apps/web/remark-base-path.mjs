// Content includes Markdown images, raw HTML pictures and MDX JSX. Keep their
// root-relative URLs portable when this publication is served below /grove/.
export default function remarkBasePath({ base = "/" } = {}) {
  const prefix = base.replace(/\/$/, "");
  const withBase = (url) => !prefix || !url.startsWith("/") || url.startsWith("//") || url === prefix || url.startsWith(`${prefix}/`)
    ? url
    : `${prefix}${url}`;
  const srcset = (value) => value.replace(/(^|,\s*)(\/(?!\/)[^\s,]*)/g, (_, separator, url) => `${separator}${withBase(url)}`);
  const attribute = (name, value) => name.toLowerCase() === "srcset" ? srcset(value) : withBase(value);
  return (tree) => {
    function visit(node) {
      if ((node.type === "image" || node.type === "link" || node.type === "definition") && typeof node.url === "string") {
        node.url = withBase(node.url);
      }
      if (node.type === "html") {
        node.value = node.value.replace(/\b(src|href|srcset)=(['"])(.*?)\2/gi,
          (_, name, quote, value) => `${name}=${quote}${attribute(name, value)}${quote}`);
      }
      for (const attr of node.attributes ?? []) {
        if (attr.type === "mdxJsxAttribute" && /^(src|href|srcset)$/i.test(attr.name) && typeof attr.value === "string") {
          attr.value = attribute(attr.name, attr.value);
        }
      }
      for (const child of node.children ?? []) visit(child);
    }
    visit(tree);
  };
}
