
const express = require("express");
const pool = require("../config/db");

const router = express.Router();

// GET /api/issues - Get all issues
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM public.issues
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Fetch issues failed:", error.message);
    res.status(500).json({
      message: "Failed to fetch issues.",
    });
  }
});

// POST /api/issues - Create an issue
router.post("/", async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      location,
      urgency,
      affected_count,
      priority,
      status,
      team,
      reported_by,
    } = req.body;

    if (
      !title?.trim() ||
      !description?.trim() ||
      !category
    ) {
      return res.status(400).json({
        message: "Title, description, and category are required.",
      });
    }

    const issueId = `CF-${Date.now()}-${Math.floor(
      Math.random() * 1000
    )}`;

    const result = await pool.query(
      `INSERT INTO public.issues (
        issue_id, title, description, category,
        location, urgency, affected_count, priority,
        status, team, reported_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *`,
      [
        issueId,
        title.trim(),
        description.trim(),
        category,
        location || "Main Block",
        urgency || "Medium",
        Math.max(1, Number(affected_count) || 1),
        Number(priority) || 50,
        status || "Pending",
        team || "Campus Support",
        reported_by || "student01",
      ]
    );

    res.status(201).json({
      message: "Issue submitted successfully!",
      issue: result.rows[0],
    });
  } catch (error) {
    console.error("Issue submission failed:", error.message);
    res.status(500).json({
      message: "Failed to submit issue.",
    });
  }
});

// PATCH /api/issues/:issueId/support - Add support
router.patch("/:issueId/support", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { affected_count, priority } = req.body;

    if (
      !Number.isInteger(Number(affected_count)) ||
      Number(affected_count) < 1 ||
      !Number.isFinite(Number(priority)) ||
      Number(priority) < 0 ||
      Number(priority) > 100
    ) {
      return res.status(400).json({
        message: "Valid affected count and priority are required.",
      });
    }

    const result = await pool.query(
      `UPDATE public.issues
       SET affected_count = $1,
           priority = $2,
           updated_at = NOW()
       WHERE issue_id = $3
         AND status <> 'Resolved'
       RETURNING *`,
      [Number(affected_count), Number(priority), issueId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Issue not found or already resolved.",
      });
    }

    res.json({
      message: "Issue support updated successfully.",
      issue: result.rows[0],
    });
  } catch (error) {
    console.error("Support update failed:", error.message);
    res.status(500).json({
      message: "Failed to update issue support.",
    });
  }
});

// PATCH /api/issues/:issueId/status - Update issue status
router.patch("/:issueId/status", async (req, res) => {
  try {
    const { issueId } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "Pending",
      "Verified",
      "Assigned",
      "In Progress",
      "Resolved",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Invalid issue status.",
      });
    }

    const result = await pool.query(
      `UPDATE public.issues
       SET status = $1,
           updated_at = NOW()
       WHERE issue_id = $2
       RETURNING *`,
      [status, issueId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Issue not found.",
      });
    }

    res.json({
      message: "Issue status updated successfully.",
      issue: result.rows[0],
    });
  } catch (error) {
    console.error("Status update failed:", error.message);
    res.status(500).json({
      message: "Failed to update issue status.",
    });
  }
});

module.exports = router;
