/**
 * Adds an html2canvas (or any) canvas to jsPDF as one JPEG per page.
 * Avoids embedding the same full-height raster on every page (which explodes file size).
 *
 * @param {*} pdf jsPDF instance
 * @param {HTMLCanvasElement} canvas
 * @param {{ jpegQuality?: number }} [opts]
 */
export function addCanvasAsPagedJpegs(pdf, canvas, opts = {}) {
  const jpegQuality = opts.jpegQuality ?? 0.68;

  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const fullHmm = (canvas.height * pageW) / canvas.width;

  const temp = document.createElement('canvas');
  temp.width = canvas.width;
  const tctx = temp.getContext('2d');

  let srcY = 0;
  let pageIdx = 0;

  while (srcY < canvas.height) {
    if (pageIdx > 0) pdf.addPage();

    const remainingMm = fullHmm - (srcY / canvas.height) * fullHmm;
    const sliceMm = Math.min(pageH, remainingMm);
    let slicePx = Math.round((sliceMm / fullHmm) * canvas.height);
    slicePx = Math.max(1, Math.min(slicePx, canvas.height - srcY));

    temp.height = slicePx;
    tctx.fillStyle = '#ffffff';
    tctx.fillRect(0, 0, temp.width, temp.height);
    tctx.drawImage(
      canvas,
      0,
      srcY,
      canvas.width,
      slicePx,
      0,
      0,
      canvas.width,
      slicePx
    );

    const displayMm = (slicePx / canvas.height) * fullHmm;
    const imgData = temp.toDataURL('image/jpeg', jpegQuality);
    pdf.addImage(imgData, 'JPEG', 0, 0, pageW, displayMm);

    srcY += slicePx;
    pageIdx += 1;
  }
}
