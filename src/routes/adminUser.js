import express from "express";
import User from "../models/user.js";
import {
  authMiddleware,
  adminOnly,
} from "../middlewares/optionalAuthMiddleware.js";

const router = express.Router();

/* =========================
   🚫 BLOCK / UNBLOCK USER
========================= */
router.put("/block/:userId", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    user.isBlocked = !user.isBlocked;

    await user.save();

    res.json({
      msg: user.isBlocked ? "User blocked" : "User unblocked",
      isBlocked: user.isBlocked,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to update user" });
  }
});

router.get("/", authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find()
      .select("name email isBlocked nameLocked createdAt")
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to fetch users" });
  }
});
router.put("/reset-attempts", authMiddleware, adminOnly, async (req, res) => {
  try {
    const { userId, domain, level } = req.body;

    const result = await Exam.updateMany(
      {
        user: userId,
        domain,
        level,
        submitted: true,
        isReset: false,
      },
      {
        $set: { isReset: true },
      },
    );

    res.json({
      msg: "Attempts reset successfully",
      modified: result.modifiedCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Failed to reset attempts" });
  }
});
router.put(
  "/toggle-name-lock/:userId",
  authMiddleware,
  adminOnly,
  async (req, res) => {
    try {
      const { userId } = req.params;

      const adminId = req.user._id;

      const user = await User.findById(userId);

      if (!user) {
        return res.status(404).json({ msg: "User not found" });
      }

      // 🔄 TOGGLE LOCK
      user.nameLocked = !user.nameLocked;
      user.nameLockedByAdmin = true;

      // 🧾 AUDIT LOG
      user.nameLockHistory.push({
        action: user.nameLocked ? "LOCK" : "UNLOCK",
        by: adminId,
        at: new Date(),
      });

      await user.save();

      res.json({
        msg: user.nameLocked
          ? "Name locked by admin"
          : "Name unlocked by admin",
        nameLocked: user.nameLocked,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ msg: "Failed to update name lock" });
    }
  },
);
export default router;
