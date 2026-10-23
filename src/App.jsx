
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import {
  getIssues,
  createIssue,
  supportIssue as sendIssueSupport,
  updateIssueStatus,
} from "./api";

const SESSION_KEY = "campusfix_session";
const CACHE_KEY = "campusfix_issues";

const STUDENT_LOGIN = {
  username: "student01",
  password: "student123",
};

const ADMIN_LOGIN = {
  username: "admin01",
  password: "admin123",
};

const categories = [
  "Infrastructure",
  "Electrical",
  "Water & Sanitation",
  "Cleanliness",
  "Internet",
  "Safety",
  "Hostel",
  "Classroom",
  "Other",
];

const locations = [
  "Main Block",
  "Library",
  "Computer Lab",
  "CSE Block",
  "ECE Block",
  "Hostel",
  "Cafeteria",
  "Parking Area",
  "Sports Ground",
];

const statuses = [
  "Pending",
  "Verified",
  "Assigned",
  "In Progress",
  "Resolved",
];

const demoIssues = [
  {
    id: "CF-1001",
    title: "Wi-Fi not working in Computer Lab",
    description:
      "Students are unable to access the internet from several systems in the computer lab.",
    category: "Internet",
    location: "Computer Lab",
    urgency: "High",
    affected: 18,
    priority: 91,
    status: "In Progress",
    team: "IT Support",
    reportedBy: "student01",
    createdAt: new Date().toISOString(),
    supportedBy: 18,
  },
  {
    id: "CF-1002",
    title: "Water leakage near Main Block",
    description:
      "There is continuous water leakage near the entrance and the floor becomes slippery.",
    category: "Water & Sanitation",
    location: "Main Block",
    urgency: "High",
    affected: 12,
    priority: 88,
    status: "Assigned",
    team: "Maintenance",
    reportedBy: "student01",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    supportedBy: 12,
  },
  {
    id: "CF-1003",
    title: "Lights not working in classroom",
    description:
      "Multiple ceiling lights are not functioning and the classroom becomes difficult to use.",
    category: "Electrical",
    location: "CSE Block",
    urgency: "Medium",
    affected: 8,
    priority: 67,
    status: "Verified",
    team: "Electrical Team",
    reportedBy: "student01",
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    supportedBy: 8,
  },
];

function calculatePriority(urgency, affected, category, location) {
  const urgencyScore = {
    Low: 10,
    Medium: 25,
    High: 40,
    Critical: 40,
  };

  const categoryScore = {
    Safety: 20,
    Electrical: 18,
    "Water & Sanitation": 18,
    Internet: 16,
    Infrastructure: 16,
    Hostel: 14,
    Cleanliness: 12,
    Classroom: 12,
    Other: 8,
  };

  const locationScore = {
    "Main Block": 10,
    Library: 9,
    "Computer Lab": 9,
    "CSE Block": 8,
    "ECE Block": 8,
    Hostel: 8,
    Cafeteria: 7,
    "Parking Area": 6,
    "Sports Ground": 5,
  };

  const urgencyPoints = urgencyScore[urgency] || 20;
  const affectedPoints = Math.min(Number(affected || 1) * 2, 30);
  const categoryPoints = categoryScore[category] || 8;
  const locationPoints = locationScore[location] || 5;

  return Math.min(
    100,
    urgencyPoints + affectedPoints + categoryPoints + locationPoints
  );
}

function getTeam(category) {
  const teams = {
    Infrastructure: "Maintenance",
    Electrical: "Electrical Team",
    "Water & Sanitation": "Maintenance",
    Cleanliness: "Housekeeping",
    Internet: "IT Support",
    Safety: "Security",
    Hostel: "Hostel Administration",
    Classroom: "Academic Facilities",
    Other: "Campus Support",
  };

  return teams[category] || "Campus Support";
}

function mapDatabaseIssue(row) {
  return {
    id: row.issue_id,
    title: row.title,
    description: row.description,
    category: row.category,
    location: row.location,
    urgency: row.urgency,
    affected: row.affected_count,
    priority: row.priority,
    status: row.status,
    team: row.team,
    reportedBy: row.reported_by,
    createdAt: row.created_at,
    supportedBy: row.affected_count,
  };
}

function getPriorityLabel(priority) {
  if (priority >= 85) return "Critical";
  if (priority >= 70) return "High";
  if (priority >= 50) return "Medium";
  return "Low";
}

function getPriorityClass(priority) {
  if (priority >= 85) return "critical";
  if (priority >= 70) return "high";
  if (priority >= 50) return "medium";
  return "low";
}

function App() {
  const [session, setSession] = useState(() => {
    try {
      const saved = localStorage.getItem(SESSION_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loginRole, setLoginRole] = useState(null);
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
  });

  const [issues, setIssues] = useState(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      return cached ? JSON.parse(cached) : demoIssues;
    } catch {
      return demoIssues;
    }
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  const [activePage, setActivePage] = useState("dashboard");
  const [selectedIssue, setSelectedIssue] = useState(null);

  const [toast, setToast] = useState("");
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterCategory, setFilterCategory] = useState("All");

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Infrastructure",
    location: "Main Block",
    urgency: "Medium",
    affected: 1,
  });

  const isAdmin = () => session?.role === "admin";
  const isStudent = () => session?.role === "student";

  function showToast(message) {
    setToast(message);
    setTimeout(() => setToast(""), 3500);
  }

  useEffect(() => {
    async function loadIssues() {
      setLoading(true);

      try {
        const data = await getIssues();
        const mapped = data.map(mapDatabaseIssue);

        setIssues(mapped);
        localStorage.setItem(CACHE_KEY, JSON.stringify(mapped));
      } catch (error) {
        console.error("Loading issues failed:", error);

        const cached = localStorage.getItem(CACHE_KEY);

        if (cached) {
          setIssues(JSON.parse(cached));
        } else {
          setIssues(demoIssues);
        }

        showToast(
          "Unable to connect to server. Showing saved campus data."
        );
      } finally {
        setLoading(false);
      }
    }

    loadIssues();
  }, []);

  useEffect(() => {
    localStorage.setItem(CACHE_KEY, JSON.stringify(issues));
  }, [issues]);

  useEffect(() => {
    function handleOnline() {
      setOnline(true);
      showToast("Internet connection restored.");
    }

    function handleOffline() {
      setOnline(false);
      showToast("You are offline. Saved data will remain available.");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const priorityPreview = useMemo(
    () =>
      calculatePriority(
        form.urgency,
        form.affected,
        form.category,
        form.location
      ),
    [form]
  );

  const duplicateMatch = useMemo(() => {
    if (!form.title.trim() && !form.description.trim()) {
      return null;
    }

    const text = `${form.title} ${form.description}`
      .toLowerCase()
      .trim();

    if (text.length < 8) return null;

    return (
      issues.find((issue) => {
        const existingText =
          `${issue.title} ${issue.description}`.toLowerCase();

        const words = text
          .split(/\s+/)
          .filter((word) => word.length > 4)
          .slice(0, 8);

        if (words.length === 0) return false;

        const matches = words.filter((word) =>
          existingText.includes(word)
        );

        return (
          matches.length >= Math.max(2, Math.ceil(words.length * 0.4))
        );
      }) || null
    );
  }, [form.title, form.description, issues]);

  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch =
        !search.trim() ||
        issue.title.toLowerCase().includes(search.toLowerCase()) ||
        issue.description.toLowerCase().includes(search.toLowerCase()) ||
        issue.location.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        filterStatus === "All" || issue.status === filterStatus;

      const matchesCategory =
        filterCategory === "All" || issue.category === filterCategory;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [issues, search, filterStatus, filterCategory]);

  const stats = useMemo(() => {
    const total = issues.length;

    const active = issues.filter(
      (issue) => issue.status !== "Resolved"
    ).length;

    const resolved = issues.filter(
      (issue) => issue.status === "Resolved"
    ).length;

    const highPriority = issues.filter(
      (issue) => issue.priority >= 70 && issue.status !== "Resolved"
    ).length;

    const affected = issues.reduce(
      (sum, issue) => sum + Number(issue.affected || 0),
      0
    );

    return { total, active, resolved, highPriority, affected };
  }, [issues]);

  const campusPulse = useMemo(() => {
    return locations.map((location) => {
      const locationIssues = issues.filter(
        (issue) => issue.location === location
      );

      const highestPriority = locationIssues.length
        ? Math.max(...locationIssues.map((issue) => issue.priority))
        : 0;

      return {
        location,
        count: locationIssues.length,
        priority: highestPriority,
      };
    });
  }, [issues]);

  function handleLoginInput(event) {
    const { name, value } = event.target;

    setLoginForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleLogin(event) {
    event.preventDefault();

    const credentials =
      loginRole === "admin" ? ADMIN_LOGIN : STUDENT_LOGIN;

    if (
      loginForm.username.trim() === credentials.username &&
      loginForm.password === credentials.password
    ) {
      const newSession = {
        role: loginRole,
        username: credentials.username,
        loggedInAt: new Date().toISOString(),
      };

      localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
      setSession(newSession);

      setLoginForm({ username: "", password: "" });
      setActivePage("dashboard");

      showToast(
        `${loginRole === "admin" ? "Admin" : "Student"} login successful.`
      );
    } else {
      showToast("Invalid username or password.");
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setLoginRole(null);
    setSelectedIssue(null);
    setActivePage("dashboard");
  }

  function goTo(page) {
    if (page === "report" && !isStudent()) {
      showToast("Only students can report an issue.");
      return;
    }

    if (page === "admin" && !isAdmin()) {
      showToast("Admin access is required.");
      return;
    }

    setSelectedIssue(null);
    setActivePage(page);
  }

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      title: "",
      description: "",
      category: "Infrastructure",
      location: "Main Block",
      urgency: "Medium",
      affected: 1,
    });
  }

  async function submitIssue(event) {
    event.preventDefault();

    if (!isStudent()) {
      showToast("Only students can submit issues.");
      return;
    }

    if (isSaving) return;

    if (!online) {
      showToast("You are offline. Please reconnect before submitting.");
      return;
    }

    if (!form.title.trim()) {
      showToast("Please enter an issue title.");
      return;
    }

    if (form.title.trim().length < 5) {
      showToast("Issue title must contain at least 5 characters.");
      return;
    }

    if (!form.description.trim()) {
      showToast("Please describe the issue.");
      return;
    }

    if (form.description.trim().length < 15) {
      showToast("Please provide a little more detail.");
      return;
    }

    if (form.description.length > 400) {
      showToast("Description cannot exceed 400 characters.");
      return;
    }

    if (Number(form.affected) < 1) {
      showToast("At least one student must be affected.");
      return;
    }

    if (duplicateMatch) {
      showToast(
        `Similar issue found: ${duplicateMatch.id}. Support it instead.`
      );

      setSelectedIssue(duplicateMatch);
      setActivePage("issue");
      return;
    }

    try {
      setIsSaving(true);

      const newIssue = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        location: form.location,
        urgency: form.urgency,
        affected_count: Number(form.affected),
        priority: priorityPreview,
        status: "Pending",
        team: getTeam(form.category),
        reported_by: session.username,
      };

      const data = await createIssue(newIssue);
      const mappedIssue = mapDatabaseIssue(data);

      setIssues((previous) => {
        const exists = previous.some(
          (issue) => issue.id === mappedIssue.id
        );

        return exists ? previous : [mappedIssue, ...previous];
      });

      resetForm();
      showToast("Issue submitted successfully.");

      setSelectedIssue(mappedIssue);
      setActivePage("issue");
    } catch (error) {
      console.error("Submit issue error:", error);
      showToast(error.message || "Could not save the issue.");
    } finally {
      setIsSaving(false);
    }
  }

  // FIXED: Student support now uses the backend API.
  async function supportIssue(issueId) {
    if (!isStudent()) {
      showToast("Please use a student account to support issues.");
      return;
    }

    if (!online) {
      showToast(
        "You are offline. Please reconnect before supporting an issue."
      );
      return;
    }

    const issue = issues.find((item) => item.id === issueId);

    if (!issue) {
      showToast("Issue not found.");
      return;
    }

    if (issue.status === "Resolved") {
      showToast("This issue has already been resolved.");
      return;
    }

    try {
      const affected = Number(issue.affected || 0) + 1;
      const priority = calculatePriority(
        issue.urgency,
        affected,
        issue.category,
        issue.location
      );

      const data = await sendIssueSupport(
        issueId,
        affected,
        priority
      );

      const updatedIssue = mapDatabaseIssue(data);

      setIssues((previous) => {
        const updated = previous.map((item) =>
          item.id === issueId ? updatedIssue : item
        );

        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });

      setSelectedIssue((previous) =>
        previous?.id === issueId ? updatedIssue : previous
      );

      showToast("Your support was added to this issue.");
    } catch (error) {
      console.error("Support issue error:", error);
      showToast(error.message || "Could not update issue support.");
    }
  }

  // FIXED: Admin status changes now use the backend API.
  async function updateStatus(issueId, status) {
    if (!isAdmin()) {
      showToast("Admin access is required to change issue status.");
      return;
    }

    if (!online) {
      showToast(
        "You are offline. Please reconnect before changing status."
      );
      return;
    }

    if (!statuses.includes(status)) {
      showToast("Invalid issue status.");
      return;
    }

    try {
      const data = await updateIssueStatus(issueId, status);
      const updatedIssue = mapDatabaseIssue(data);

      setIssues((previous) => {
        const updated = previous.map((issue) =>
          issue.id === issueId ? updatedIssue : issue
        );

        localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        return updated;
      });

      setSelectedIssue((previous) =>
        previous?.id === issueId ? updatedIssue : previous
      );

      showToast(`Issue marked as ${status}.`);
    } catch (error) {
      console.error("Update status error:", error);
      showToast(error.message || "Could not update issue status.");
    }
  }

  function openIssue(issue) {
    setSelectedIssue(issue);
    setActivePage("issue");
  }

  function formatDate(date) {
    if (!date) return "Recently";

    const current = new Date();
    const target = new Date(date);

    const diff = current.getTime() - target.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;

    return target.toLocaleDateString();
  }

  if (!session) {
    if (!loginRole) {
      return (
        <div className="auth-shell">
          <div className="auth-brand">
            <div className="brand-mark">CF</div>
            <div>
              <h1>CampusFix</h1>
              <p>Smart Campus Issue Resolution</p>
            </div>
          </div>

          <div className="role-selection">
            <div className="auth-heading">
              <span className="eyebrow">WELCOME</span>
              <h2>How do you want to enter?</h2>
              <p>Select your role to access the CampusFix portal.</p>
            </div>

            <div className="role-grid">
              <button
                className="role-card"
                onClick={() => setLoginRole("student")}
              >
                <div className="role-icon">🎓</div>
                <h3>Student</h3>
                <p>
                  Report campus problems, support existing issues and
                  track progress.
                </p>
                <span>Continue as Student →</span>
              </button>

              <button
                className="role-card"
                onClick={() => setLoginRole("admin")}
              >
                <div className="role-icon">🛡️</div>
                <h3>Admin / Staff</h3>
                <p>
                  Review reported issues, prioritize problems and update
                  resolution status.
                </p>
                <span>Continue as Admin →</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    const isAdminLogin = loginRole === "admin";

    return (
      <div className="auth-shell">
        <div className="auth-brand">
          <div className="brand-mark">CF</div>
          <div>
            <h1>CampusFix</h1>
            <p>Smart Campus Issue Resolution</p>
          </div>
        </div>

        <div className="login-wrapper">
          <button
            className="back-button"
            onClick={() => setLoginRole(null)}
          >
            ← Back to role selection
          </button>

          <form className="login-card" onSubmit={handleLogin}>
            <div className="auth-heading">
              <span className="eyebrow">
                {isAdminLogin ? "ADMIN PORTAL" : "STUDENT PORTAL"}
              </span>
              <h2>{isAdminLogin ? "Admin sign in" : "Student sign in"}</h2>
              <p>
                {isAdminLogin
                  ? "Access the CampusFix Action Center."
                  : "Report and track issues across your campus."}
              </p>
            </div>

            <label>
              Username
              <input
                name="username"
                value={loginForm.username}
                onChange={handleLoginInput}
                placeholder={isAdminLogin ? "admin01" : "student01"}
                autoComplete="username"
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                value={loginForm.password}
                onChange={handleLoginInput}
                placeholder="Enter password"
                autoComplete="current-password"
              />
            </label>

            <button type="submit" className="primary-button full-width">
              Sign in
            </button>

            <div className="demo-credentials">
              <strong>Demo credentials</strong>
              <span>
                Username: {isAdminLogin ? "admin01" : "student01"}
              </span>
              <span>
                Password: {isAdminLogin ? "admin123" : "student123"}
              </span>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!online && (
        <div className="offline-banner">
          <span>●</span>
          You are offline. CampusFix is showing saved data.
        </div>
      )}

      <header className="topbar">
        <button
          className="brand-button"
          onClick={() => goTo("dashboard")}
        >
          <div className="brand-mark small">CF</div>
          <div>
            <strong>CampusFix</strong>
            <span>Campus Issue Resolution</span>
          </div>
        </button>

        <nav className="main-nav">
          <button
            className={
              activePage === "dashboard" ? "nav-button active" : "nav-button"
            }
            onClick={() => goTo("dashboard")}
          >
            Dashboard
          </button>

          {isStudent() && (
            <>
              <button
                className={
                  activePage === "report" ? "nav-button active" : "nav-button"
                }
                onClick={() => goTo("report")}
              >
                Report Issue
              </button>

              <button
                className="nav-button"
                onClick={() => {
                  setSearch(session.username);
                  setActivePage("issues");
                }}
              >
                My Issues
              </button>
            </>
          )}

          {isAdmin() && (
            <button
              className={
                activePage === "admin" ? "nav-button active" : "nav-button"
              }
              onClick={() => goTo("admin")}
            >
              All Issues
            </button>
          )}

          <button
            className={
              activePage === "pulse" ? "nav-button active" : "nav-button"
            }
            onClick={() => goTo("pulse")}
          >
            Campus Pulse
          </button>
        </nav>

        <div className="user-area">
          <span className={isAdmin() ? "role-chip admin" : "role-chip student"}>
            {isAdmin() ? "ADMIN" : "STUDENT"}
          </span>

          <div className="avatar">
            {session.username.charAt(0).toUpperCase()}
          </div>

          <button
            className="logout-button"
            onClick={logout}
            title="Logout"
          >
            ↪
          </button>
        </div>
      </header>

      <main className="main-content">
        {activePage === "dashboard" && (
          <>
            <section className="hero-section">
              <div>
                <span className="eyebrow">CAMPUS PULSE</span>
                <h1>
                  Turn campus problems
                  <br />
                  into <span>smart action.</span>
                </h1>
                <p>
                  CampusFix groups similar issues, measures community impact
                  and helps campus teams resolve the most important problems
                  first.
                </p>

                <div className="hero-actions">
                  {isStudent() && (
                    <button
                      className="primary-button"
                      onClick={() => goTo("report")}
                    >
                      + Report an Issue
                    </button>
                  )}
                  <button
                    className="secondary-button"
                    onClick={() => goTo("pulse")}
                  >
                    View Campus Pulse →
                  </button>
                </div>
              </div>

              <div className="hero-card">
                <div className="hero-card-top">
                  <span>LIVE CAMPUS SIGNAL</span>
                  <span className="live-dot">● LIVE</span>
                </div>
                <div className="hero-number">{stats.affected}</div>
                <p>
                  student impact signals
                  <br />
                  across campus
                </p>
                <div className="hero-mini-stats">
                  <div>
                    <strong>{stats.active}</strong>
                    <span>Active</span>
                  </div>
                  <div>
                    <strong>{stats.highPriority}</strong>
                    <span>High priority</span>
                  </div>
                  <div>
                    <strong>{stats.resolved}</strong>
                    <span>Resolved</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="stats-grid">
              <div className="stat-card">
                <span>Total issues</span>
                <strong>{stats.total}</strong>
                <small>Reported on campus</small>
              </div>
              <div className="stat-card">
                <span>Active issues</span>
                <strong>{stats.active}</strong>
                <small>Need attention</small>
              </div>
              <div className="stat-card">
                <span>High priority</span>
                <strong>{stats.highPriority}</strong>
                <small>Priority score 70+</small>
              </div>
              <div className="stat-card">
                <span>Resolved</span>
                <strong>{stats.resolved}</strong>
                <small>Successfully closed</small>
              </div>
            </section>

            <section className="section-header">
              <div>
                <span className="eyebrow">COMMUNITY SIGNAL</span>
                <h2>Issues needing attention</h2>
              </div>
              <button
                className="text-button"
                onClick={() => setActivePage("issues")}
              >
                View all →
              </button>
            </section>

            {loading ? (
              <div className="loading-card">
                <div className="spinner"></div>
                <p>Loading campus issues...</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="empty-state">
                <div>✓</div>
                <h3>No issues found</h3>
                <p>Great! There are no matching campus issues.</p>
              </div>
            ) : (
              <div className="issue-grid">
                {filteredIssues
                  .slice()
                  .sort((a, b) => b.priority - a.priority)
                  .slice(0, 3)
                  .map((issue) => (
                    <IssueCard
                      key={issue.id}
                      issue={issue}
                      isStudent={isStudent()}
                      isAdmin={isAdmin()}
                      onOpen={openIssue}
                      onSupport={supportIssue}
                      onStatus={updateStatus}
                    />
                  ))}
              </div>
            )}

            <section className="pulse-preview">
              <div className="section-header">
                <div>
                  <span className="eyebrow">CAMPUS MAP</span>
                  <h2>Where problems are happening</h2>
                </div>
                <button
                  className="text-button"
                  onClick={() => goTo("pulse")}
                >
                  Explore pulse →
                </button>
              </div>

              <CampusMap
                campusPulse={campusPulse}
                onSelect={(location) => {
                  setSearch(location);
                  setActivePage("issues");
                }}
              />
            </section>
          </>
        )}

        {activePage === "report" && isStudent() && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">SMART REPORTING</span>
              <h1>Report a campus issue</h1>
              <p>
                Tell us what happened. CampusFix calculates priority
                automatically.
              </p>
            </div>

            <div className="report-layout">
              <form className="report-card" onSubmit={submitIssue}>
                <label>
                  Issue title
                  <input
                    value={form.title}
                    onChange={(event) =>
                      updateForm("title", event.target.value)
                    }
                    placeholder="Example: Wi-Fi not working in lab"
                    maxLength={100}
                  />
                </label>

                <label>
                  Description
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm("description", event.target.value)
                    }
                    placeholder="Describe the problem, where it happens and how it affects students..."
                    maxLength={400}
                    rows={6}
                  />
                  <small>{form.description.length}/400 characters</small>
                </label>

                <div className="form-grid">
                  <label>
                    Category
                    <select
                      value={form.category}
                      onChange={(event) =>
                        updateForm("category", event.target.value)
                      }
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    Location
                    <select
                      value={form.location}
                      onChange={(event) =>
                        updateForm("location", event.target.value)
                      }
                    >
                      {locations.map((location) => (
                        <option key={location} value={location}>
                          {location}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-grid">
                  <label>
                    Urgency
                    <select
                      value={form.urgency}
                      onChange={(event) =>
                        updateForm("urgency", event.target.value)
                      }
                    >
                      <option>Low</option>
                      <option>Medium</option>
                      <option>High</option>
                    </select>
                  </label>

                  <label>
                    Students affected
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={form.affected}
                      onChange={(event) =>
                        updateForm(
                          "affected",
                          Math.max(1, Number(event.target.value))
                        )
                      }
                    />
                  </label>
                </div>

                {duplicateMatch && (
                  <div className="duplicate-warning">
                    <strong>Similar issue detected</strong>
                    <p>
                      {duplicateMatch.title} ({duplicateMatch.id}) already
                      exists. You can support that issue instead of creating
                      another duplicate.
                    </p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => openIssue(duplicateMatch)}
                    >
                      View existing issue
                    </button>
                  </div>
                )}

                <button
                  className="primary-button full-width"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? "Saving issue..." : "Submit issue"}
                </button>
              </form>

              <div className="priority-card">
                <span className="eyebrow">SMART PRIORITY</span>
                <div
                  className={`priority-circle ${getPriorityClass(
                    priorityPreview
                  )}`}
                >
                  <strong>{priorityPreview}</strong>
                  <span>/100</span>
                </div>
                <h3>{getPriorityLabel(priorityPreview)} priority</h3>
                <p>
                  CampusFix combines urgency, affected students, category and
                  location to calculate a transparent priority score.
                </p>
                <div className="team-preview">
                  <span>Suggested team</span>
                  <strong>{getTeam(form.category)}</strong>
                </div>
              </div>
            </div>
          </section>
        )}

        {activePage === "issues" && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">
                {isAdmin() ? "ISSUE MANAGEMENT" : "MY CAMPUS ISSUES"}
              </span>
              <h1>{isAdmin() ? "All reported issues" : "Campus issue board"}</h1>
              <p>
                Search, filter and open an issue to see its complete
                resolution timeline.
              </p>
            </div>

            <div className="filters">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search issues..."
              />
              <select
                value={filterStatus}
                onChange={(event) => setFilterStatus(event.target.value)}
              >
                <option>All</option>
                {statuses.map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
              <select
                value={filterCategory}
                onChange={(event) => setFilterCategory(event.target.value)}
              >
                <option>All</option>
                {categories.map((category) => (
                  <option key={category}>{category}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="loading-card">
                <div className="spinner"></div>
                <p>Loading issues...</p>
              </div>
            ) : filteredIssues.length === 0 ? (
              <div className="empty-state">
                <div>⌕</div>
                <h3>No matching issues</h3>
                <p>Try another search term or filter.</p>
              </div>
            ) : (
              <div className="issue-grid large">
                {filteredIssues.map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isStudent={isStudent()}
                    isAdmin={isAdmin()}
                    onOpen={openIssue}
                    onSupport={supportIssue}
                    onStatus={updateStatus}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {activePage === "pulse" && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">CAMPUS PULSE</span>
              <h1>See what is happening across campus</h1>
              <p>A live view of issue concentration and community impact.</p>
            </div>

            <CampusMap
              campusPulse={campusPulse}
              onSelect={(location) => {
                setSearch(location);
                setActivePage("issues");
              }}
            />

            <div className="pulse-list">
              {campusPulse
                .filter((item) => item.count > 0)
                .sort((a, b) => b.priority - a.priority)
                .map((item) => (
                  <button
                    key={item.location}
                    className="pulse-location"
                    onClick={() => {
                      setSearch(item.location);
                      setActivePage("issues");
                    }}
                  >
                    <div>
                      <strong>{item.location}</strong>
                      <span>
                        {item.count} active signal{item.count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="pulse-score">{item.priority}</div>
                  </button>
                ))}
            </div>
          </section>
        )}

        {activePage === "admin" && isAdmin() && (
          <section className="page-section">
            <div className="page-heading">
              <span className="eyebrow">ADMIN ACTION CENTER</span>
              <h1>Resolve the problems that matter most</h1>
              <p>
                Review priority, community impact and status before taking
                action.
              </p>
            </div>

            <div className="admin-summary">
              <div>
                <span>High priority</span>
                <strong>{stats.highPriority}</strong>
              </div>
              <div>
                <span>Active</span>
                <strong>{stats.active}</strong>
              </div>
              <div>
                <span>Community impact</span>
                <strong>{stats.affected}</strong>
              </div>
              <div>
                <span>Resolved</span>
                <strong>{stats.resolved}</strong>
              </div>
            </div>

            <div className="section-header">
              <div>
                <span className="eyebrow">NEEDS ATTENTION</span>
                <h2>Priority queue</h2>
              </div>
            </div>

            <div className="issue-grid large">
              {issues
                .filter((issue) => issue.status !== "Resolved")
                .sort((a, b) => b.priority - a.priority)
                .map((issue) => (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    isStudent={false}
                    isAdmin={true}
                    onOpen={openIssue}
                    onSupport={supportIssue}
                    onStatus={updateStatus}
                  />
                ))}
            </div>
          </section>
        )}

        {activePage === "issue" && selectedIssue && (
          <section className="page-section">
            <button
              className="back-button"
              onClick={() => setActivePage(isAdmin() ? "admin" : "issues")}
            >
              ← Back
            </button>

            <div className="issue-detail">
              <div className="detail-main">
                <div className="detail-header">
                  <div>
                    <span className="issue-id">{selectedIssue.id}</span>
                    <h1>{selectedIssue.title}</h1>
                    <p>
                      Reported {formatDate(selectedIssue.createdAt)} by{" "}
                      {selectedIssue.reportedBy}
                    </p>
                  </div>

                  <div
                    className={`priority-badge ${getPriorityClass(
                      selectedIssue.priority
                    )}`}
                  >
                    <strong>{selectedIssue.priority}</strong>
                    <span>priority</span>
                  </div>
                </div>

                <div className="detail-tags">
                  <span>{selectedIssue.category}</span>
                  <span>{selectedIssue.location}</span>
                  <span>{selectedIssue.urgency}</span>
                  <span>{selectedIssue.affected} affected</span>
                </div>

                <div className="description-box">
                  <h3>Issue description</h3>
                  <p>{selectedIssue.description}</p>
                </div>

                <IssueTimeline status={selectedIssue.status} />
              </div>

              <aside className="detail-side">
                <div className="side-card">
                  <span className="eyebrow">COMMUNITY SIGNAL</span>
                  <strong className="affected-number">
                    {selectedIssue.affected}
                  </strong>
                  <p>students affected by this issue</p>

                  {isStudent() && selectedIssue.status !== "Resolved" && (
                    <button
                      className="primary-button full-width"
                      onClick={() => supportIssue(selectedIssue.id)}
                    >
                      + I'm affected too
                    </button>
                  )}

                  {isStudent() && (
                    <small className="support-note">
                      Supporting an existing issue helps campus teams
                      understand its impact.
                    </small>
                  )}
                </div>

                <div className="side-card">
                  <span className="eyebrow">ASSIGNED TEAM</span>
                  <h3>{selectedIssue.team}</h3>
                  <p>Recommended based on the issue category.</p>

                  {isAdmin() && (
                    <label className="status-control">
                      Update status
                      <select
                        value={selectedIssue.status}
                        onChange={(event) =>
                          updateStatus(selectedIssue.id, event.target.value)
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {!isAdmin() && (
                    <div className="managed-note">
                      Status updates are managed by campus administrators.
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </section>
        )}
      </main>

      {toast && (
        <div className="toast" role="status">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

function IssueCard({
  issue,
  isStudent,
  isAdmin,
  onOpen,
  onSupport,
  onStatus,
}) {
  return (
    <article className="issue-card">
      <div className="issue-card-top">
        <span className="issue-id">{issue.id}</span>
        <span
          className={`priority-pill ${getPriorityClass(issue.priority)}`}
        >
          {issue.priority}
        </span>
      </div>

      <h3>{issue.title}</h3>
      <p>{issue.description}</p>

      <div className="issue-meta">
        <span>📍 {issue.location}</span>
        <span>👥 {issue.affected}</span>
      </div>

      <div className="issue-card-footer">
        <span className="status-pill">{issue.status}</span>
        <span className="category-pill">{issue.category}</span>
      </div>

      <div className="issue-actions">
        <button
          className="secondary-button"
          onClick={() => onOpen(issue)}
        >
          View details
        </button>

        {isStudent && issue.status !== "Resolved" && (
          <button
            className="support-button"
            onClick={() => onSupport(issue.id)}
          >
            + Affected
          </button>
        )}

        {isAdmin && (
          <select
            className="small-status-select"
            value={issue.status}
            onChange={(event) => onStatus(issue.id, event.target.value)}
          >
            {statuses.map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        )}
      </div>
    </article>
  );
}

function CampusMap({ campusPulse, onSelect }) {
  const mapLocations = [
    { name: "Main Block", x: "24%", y: "28%" },
    { name: "Library", x: "51%", y: "20%" },
    { name: "Computer Lab", x: "76%", y: "30%" },
    { name: "CSE Block", x: "28%", y: "61%" },
    { name: "ECE Block", x: "55%", y: "57%" },
    { name: "Hostel", x: "78%", y: "66%" },
  ];

  return (
    <div className="campus-map">
      <div className="map-road road-one"></div>
      <div className="map-road road-two"></div>
      <div className="map-road road-three"></div>

      {mapLocations.map((location) => {
        const data = campusPulse.find(
          (item) => item.location === location.name
        );

        return (
          <button
            key={location.name}
            className={`map-node ${
              data?.priority >= 70 ? "hot" : data?.count ? "active" : ""
            }`}
            style={{ left: location.x, top: location.y }}
            onClick={() => onSelect(location.name)}
          >
            <span className="map-dot"></span>
            <strong>{location.name}</strong>
            <small>
              {data?.count || 0} issue{data?.count === 1 ? "" : "s"}
            </small>
          </button>
        );
      })}

      <div className="map-legend">
        <span>
          <i className="legend-dot"></i>
          Active
        </span>
        <span>
          <i className="legend-dot hot"></i>
          High priority
        </span>
      </div>
    </div>
  );
}

function IssueTimeline({ status }) {
  const steps = [
    "Pending",
    "Verified",
    "Assigned",
    "In Progress",
    "Resolved",
  ];

  const currentIndex = steps.indexOf(status);

  return (
    <div className="timeline-card">
      <span className="eyebrow">RESOLUTION TIMELINE</span>

      <div className="timeline">
        {steps.map((step, index) => {
          const completed = index <= currentIndex;

          return (
            <div
              key={step}
              className={`timeline-step ${completed ? "completed" : ""}`}
            >
              <div className="timeline-dot">
                {completed ? "✓" : index + 1}
              </div>
              <span>{step}</span>

              {index < steps.length - 1 && (
                <div
                  className={`timeline-line ${
                    index < currentIndex ? "completed" : ""
                  }`}
                ></div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default App;
