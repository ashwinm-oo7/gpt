import Exam from "../models/Exam.js";
import {
  generateCertificate,
  generateCertificateMobile,
} from "../utils/pdfCertificate.js";

export const downloadCertificateService = async (req, res) => {
  const { domain, level, certificateId } = req.params;
  const userAgent = req.headers["user-agent"];
  const isMobile =
    /Android|iPhone|iPad|iPod/i.test(userAgent) && window.innerWidth < 768;
  //   const exam = await Exam.findOne({
  //     user: req.user._id,
  //     domain,
  //     level: Number(level),
  //     certificateEligible: true,
  //   });
  const exam = await Exam.findOne({
    certificateId,
    certificateEligible: true,
  }).populate({
    path: "user",
    select: "name email",
    options: { lean: true },
  });
  const userData = {
    name: exam.user?.name,
    email: exam.user?.email,
  };
  console.log("userdata", userData);
  if (!exam) {
    return res.status(403).json({
      message: "Certificate not available",
    });
  }

  // res.setHeader(
  //   "Content-Disposition",
  //   `attachment; filename=certificate-${exam.domain}-L${exam.level}.pdf`,
  // );

  res.setHeader("Content-Type", "application/pdf");

  // ✅ Call different generator
  if (isMobile) {
    console.log("📱 Mobile certificate");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=certificate-${exam.domain}-L${exam.level}.pdf`,
    );

    return generateCertificateMobile(res, userData, exam);
  } else {
    console.log("🖥 Desktop certificate");
    return generateCertificate(res, userData, exam);
  }
};
