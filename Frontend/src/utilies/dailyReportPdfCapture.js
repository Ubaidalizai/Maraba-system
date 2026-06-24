/** Shared html2canvas helpers for daily report PDF export. */

export const PDF_PAGE_WIDTH_PX = 794;

export const patchOklabColors = (root) => {
  if (!root) return;
  const props = [
    "color",
    "background",
    "backgroundColor",
    "borderColor",
    "fill",
    "stroke",
  ];
  const all = [root, ...root.querySelectorAll("*")];
  all.forEach((el) => {
    const styles = window.getComputedStyle(el);
    props.forEach((prop) => {
      const val = styles[prop];
      if (!val || (!val.includes("oklab") && !val.includes("oklch"))) return;
      if (prop === "color") {
        el.style[prop] = "#1e293b";
      } else if (prop.includes("background")) {
        el.style[prop] = "#ffffff";
      } else if (prop.includes("border")) {
        el.style[prop] = "#e2e8f0";
      } else {
        el.style[prop] = "#222222";
      }
    });
  });
};

export const prepareNodeForPdfCapture = (root) => {
  if (!root) return;
  root.querySelectorAll("*").forEach((el) => {
    const { overflow, overflowX, overflowY } = window.getComputedStyle(el);
    if (overflow !== "visible") el.style.overflow = "visible";
    if (overflowX !== "visible") el.style.overflowX = "visible";
    if (overflowY !== "visible") el.style.overflowY = "visible";
  });
};

export const buildPdfCaptureNode = (source) => {
  const wrapper = document.createElement("div");
  wrapper.id = "daily-report-pdf-capture";
  wrapper.setAttribute(
    "style",
    [
      "position:fixed",
      "left:-20000px",
      "top:0",
      `width:${PDF_PAGE_WIDTH_PX}px`,
      "box-sizing:border-box",
      "background:#ffffff",
      "padding:16px",
      "margin:0",
      "overflow:visible",
      "pointer-events:none",
      "opacity:1",
      "z-index:-1",
    ].join(";")
  );
  const clone = source.cloneNode(true);
  clone.removeAttribute("id");
  clone.removeAttribute("aria-hidden");
  clone.setAttribute(
    "style",
    [
      "position:relative",
      `width:${PDF_PAGE_WIDTH_PX - 32}px`,
      `max-width:${PDF_PAGE_WIDTH_PX - 32}px`,
      "box-sizing:border-box",
      "max-height:none",
      "overflow:visible",
      "opacity:1",
      "margin:0",
      "padding:0",
      "background:#ffffff",
      "font-family:Arial,Tahoma,sans-serif",
    ].join(";")
  );
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);
  prepareNodeForPdfCapture(wrapper);
  return wrapper;
};

export const removePdfCaptureNode = (node) => {
  if (node?.parentNode) {
    node.parentNode.removeChild(node);
  }
};
