export const getBadge = (level) => {
  const badges = {
    1: {
      icon: "🥉",
      title: "Foundation Certification",
      color: "#cd7f32",
    },
    2: {
      icon: "🥈",
      title: "Professional Certification",
      color: "#c0c0c0",
    },
    3: {
      icon: "🥇",
      title: "Advanced Certification",
      color: "#d4af37",
    },
  };

  return (
    badges[level] || {
      icon: "🏆",
      title: "Master Certification",
      color: "#b29600",
    }
  );
};

export const drawMedal = (doc, x, y, badge) => {
  doc.circle(x, y, 45).fill(badge.color);

  doc.circle(x, y, 36).fill("#ffffff");

  doc.circle(x, y, 30).fill(badge.color);

  doc
    .fillColor("#fff")
    .fontSize(28)
    .text(badge.icon, x - 12, y - 16);
};
export const drawSeal = (doc, x, y) => {
  doc.circle(x, y, 34).fill("#caa64c");

  doc.circle(x, y, 28).fill("#e8c870");

  doc.circle(x, y, 20).fill("#caa64c");

  doc
    .fillColor("#fff")
    .fontSize(10)
    .text("MI", x - 7, y - 6);
};
