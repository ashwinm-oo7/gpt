export const drawInstituteLogo = (doc, x, y) => {
  doc.circle(x, y, 30).fill("#d4af37");

  doc.circle(x, y, 26).fill("#1a2b4c");

  doc
    .fillColor("#fff")
    .fontSize(14)
    .text("MI", x - 10, y - 8);
};
