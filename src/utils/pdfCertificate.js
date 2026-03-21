import PDFDocument from "pdfkit";
import QRCode from "qrcode";
import { getBadge } from "./certificateBadge.js";

export const generateCertificate = async (res, user, exam) => {
  const badge = getBadge(exam.level);

  const verifyUrl = `${process.env.DeployLink}/verify/${exam.certificateId}`;
  const qrImage = await QRCode.toDataURL(verifyUrl);

  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 0,
  });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename=${exam.domain}-certificate.pdf`,
  );

  res.setHeader("Content-Type", "application/pdf");

  doc.pipe(res);

  const W = 842;
  const H = 595;

  /*
  =================================
  BACKGROUND
  =================================
  */

  doc.rect(0, 0, W, H).fill("#fdfaf3");

  /*
  =================================
  TRIPLE GOLD BORDER (3D LOOK)
  =================================
  */

  doc
    .lineWidth(12)
    .strokeColor("#caa64c")
    .rect(25, 25, W - 50, H - 50)
    .stroke();

  doc
    .lineWidth(3)
    .strokeColor("#f5e7a1")
    .rect(40, 40, W - 80, H - 80)
    .stroke();

  doc
    .lineWidth(1)
    .strokeColor("#9f7c25")
    .rect(55, 55, W - 110, H - 110)
    .stroke();

  /*
  =================================
  WATERMARK
  =================================
  */

  doc.opacity(0.08).fontSize(120).fillColor("#000").text("Maurya", 200, 260);

  doc.opacity(1);

  /*
  =================================
  HEADER
  =================================
  */

  doc.fillColor("#2c3e50").fontSize(44).text("Maurya Institute", 0, 85, {
    align: "center",
  });

  doc
    .fontSize(18)
    .fillColor("#555")
    .text("Global Technology Certification Authority", 0, 135, {
      align: "center",
    });

  /*
  =================================
  CERTIFICATE TITLE
  =================================
  */

  doc
    .fontSize(30)
    .fillColor("#000")
    .text("Certificate of Achievement", 0, 175, {
      align: "center",
    });

  /*
  =================================
  MEDAL BADGE
  =================================
  */

  doc.circle(W / 2, 245, 45).fill(badge.color);

  doc
    .fillColor("#fff")
    .fontSize(30)
    .text(badge.icon, W / 2 - 12, 230);

  doc.fillColor("#333").fontSize(14).text(badge.title, 0, 300, {
    align: "center",
  });

  /*
  =================================
  PRESENTED TO
  =================================
  */

  doc.fontSize(18).text("This certificate is proudly presented to", 0, 335, {
    align: "center",
  });

  doc
    .fillColor("#1a73e8")
    .fontSize(36)
    .text(user.name || user.email, 0, 365, {
      align: "center",
    });

  /*
  =================================
  COURSE
  =================================
  */

  doc
    .fillColor("#000")
    .fontSize(18)
    .text("for successfully completing", 0, 420, {
      align: "center",
    });

  doc.fontSize(24).text(`${exam.domain} Level ${exam.level}`, 0, 450, {
    align: "center",
  });

  /*
  =================================
  SCORE
  =================================
  */

  doc
    .fontSize(16)
    .fillColor("#333")
    .text(`Score Achieved: ${exam.percentage}%`, 0, 485, {
      align: "center",
    });

  /*
  =================================
  CERTIFICATE ID
  =================================
  */

  doc
    .fontSize(10)
    .fillColor("#666")
    .text(`Certificate ID: ${exam.certificateId}`, 0, 510, {
      align: "center",
    });

  doc.text(
    `Issued On: ${new Date(exam.certificateIssuedAt).toDateString()}`,
    0,
    525,
    { align: "center" },
  );

  /*
  =================================
  SIGNATURE
  =================================
  */

  const sigY = H - 135;

  doc.moveTo(120, sigY).lineTo(280, sigY).stroke();

  doc
    .fontSize(18)
    .fillColor("#000")
    .text("MauryaAshwin", 140, sigY + 5);

  doc
    .fontSize(11)
    .fillColor("#444")
    .text("Director", 185, sigY + 30);

  /*
  =================================
  GOLD SEAL
  =================================
  */

  doc.circle(W / 2, H - 110, 32).fill("#d4af37");

  doc
    .fillColor("#fff")
    .fontSize(12)
    .text("MI", W / 2 - 7, H - 118);

  /*
  =================================
  QR VERIFY
  =================================
  */

  doc.image(qrImage, W - 150, H - 140, {
    width: 85,
  });

  doc
    .fontSize(9)
    .fillColor("#444")
    .text("Scan to verify authenticity", W - 160, H - 45);

  doc.end();
};
