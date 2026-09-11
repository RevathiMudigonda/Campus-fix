import { useEffect, useMemo, useState } from "react";
import "./App.css";

const STORAGE_KEY = "campusfix_issues";
const SESSION_KEY = "campusfix_session";

const STUDENT_CREDENTIALS = {
  username: "student01",
  password: "student123",
};

const ADMIN_CREDENTIALS = {
  username: "admin01",
  password: "admin123",
};

const categories = [
  "Wi-Fi",
  "Water",
  "Electricity",
  "Cleanliness",
  "Security",
  "Infrastructure",
  "Other",
];

const locations = [
  "Block A",
  "Block B",
  "Block C",
  "Hostel A",
  "Hostel B",
  "Library",
  "Cafeteria",
  "Main Gate",
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
    id: "CF-1042",
    title: "Wi-Fi outage in Computer Lab",
    description:
      "Students are unable to access the campus network in the computer laboratory.",
    category: "Wi-Fi",
    location: "Block C",
    urgency: "Critical",
    affected: 27,
    priority: 92,
    status: "In Progress",
    team: "IT Support",
    createdAt: "Today",
    supportedBy: 27,
    reportedBy: "student01",
  },
  {
    id: "CF-1038",
    title: "Water leakage on second floor",
    description:
      "A water pipe is leaking near the second-floor corridor.",
    category: "Water",
    location: "Hostel B",
    urgency: "High",
    affected: 18,
    priority: 88,
    status: "Pending",
    team: "Plumbing",
    createdAt: "Today",
    supportedBy: 18,
    reportedBy: "student01",
  },
  {
    id: "CF-1031",
    title: "Power failure in Room 204",
    description:
      "Power supply is unavailable in Room 204 and nearby classrooms.",
    category: "Electricity",
    location: "Block A",
    urgency: "High",
    affected: 42,
    priority: 86,
    status: "In Progress",
    team: "Electrical",
    createdAt: "Yesterday",
    supportedBy: 42,
    reportedBy: "student01",
  },
];

function getTeam(category) {
  const teams = {
    "Wi-Fi": "IT Support",
    Water: "Plumbing",
    Electricity: "Electrical",
    Cleanliness: "Housekeeping",
    Security: "Security Team",
    Infrastructure: "Maintenance",
    Other: "Campus Operations",
  };

  return teams[category] || "Campus Operations";
}

function getIcon(category) {
  const icons = {
    "Wi-Fi": "◉",
    Water: "◒",
    Electricity: "ϟ",
    Cleanliness: "✦",
    Security: "◇",
    Infrastructure: "▣",
    Other: "•",
  };

  return icons[category] || "•";
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function calculatePriority(urgency, affected, category, location) {
  const urgencyScore = {
    Low: 10,
    Medium: 25,
    High: 35,
    Critical: 40,
  };

  const categoryScore = {
    "Wi-Fi": 18,
    Electricity: 20,
    Water: 20,
    Security: 20,
    Infrastructure: 16,
    Cleanliness: 10,
    Other: 8,
  };

  const locationScore =
    location === "Main Gate" ||
    location === "Library" ||
    location === "Cafeteria"
      ? 10
      : 7;

  const peopleScore = Math.min(Number(affected || 0) * 0.75, 30);

  return Math.min(
    100,
    Math.round(
      (urgencyScore[urgency] || 10) +
        peopleScore +
        (categoryScore[category] || 8) +
        locationScore
    )
  );
}

function priorityLabel(priority) {
  if (priority >= 85) return "Critical";
  if (priority >= 70) return "High";
  if (priority >= 45) return "Medium";
  return "Low";
}

function statusIndex(status) {
  return statuses.indexOf(status);
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

  const [loginError, setLoginError] = useState("");

  const [issues, setIssues] = useState([]);
  const [screen, setScreen] = useState("dashboard");
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [search, setSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [toast, setToast] = useState("");
  const [showAdmin, setShowAdmin] = useState(false);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "Wi-Fi",
    location: "Block A",
    urgency: "Medium",
    affected: 1,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved) {
          setIssues(JSON.parse(saved));
        } else {
          setIssues(demoIssues);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(demoIssues));
        }
      } catch {
        setIssues(demoIssues);
      }

      setIsLoading(false);
    }, 350);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(issues));
    }
  }, [issues, isLoading]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showToast("Connection restored.");
    };

    const handleOffline = () => {
      setIsOnline(false);
      showToast("You are offline. Changes are saved locally.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  function showToast(message) {
    setToast(message);

    setTimeout(() => {
      setToast("");
    }, 3000);
  }

  function handleLoginChange(field, value) {
    setLoginForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setLoginError("");
  }

  function handleLogin(event) {
    event.preventDefault();

    const username = loginForm.username.trim();
    const password = loginForm.password;

    const credentials =
      loginRole === "admin"
        ? ADMIN_CREDENTIALS
        : STUDENT_CREDENTIALS;

    if (
      username === credentials.username &&
      password === credentials.password
    ) {
      const newSession = {
        role: loginRole,
        username,
        loggedInAt: new Date().toISOString(),
      };

      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify(newSession)
      );

      setSession(newSession);
      setLoginForm({
        username: "",
        password: "",
      });
      setLoginError("");
      setScreen("dashboard");
      setShowAdmin(false);
    } else {
      setLoginError(
        loginRole === "admin"
          ? "Invalid admin credentials."
          : "Invalid student credentials."
      );
    }
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setLoginRole(null);
    setScreen("dashboard");
    setSelectedIssue(null);
    setShowAdmin(false);
  }

  function isAdmin() {
    return session?.role === "admin";
  }

  function isStudent() {
    return session?.role === "student";
  }

  function updateForm(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      title: "",
      description: "",
      category: "Wi-Fi",
      location: "Block A",
      urgency: "Medium",
      affected: 1,
    });
  }

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

  const sortedIssues = useMemo(
    () => [...issues].sort((a, b) => b.priority - a.priority),
    [issues]
  );

  const activeIssues = issues.filter(
    (issue) => issue.status !== "Resolved"
  );

  const criticalIssues = issues.filter(
    (issue) =>
      issue.priority >= 85 && issue.status !== "Resolved"
  );

  const resolvedIssues = issues.filter(
    (issue) => issue.status === "Resolved"
  );

  const totalAffected = issues.reduce(
    (sum, issue) => sum + Number(issue.affected || 0),
    0
  );

  const myIssues = issues.filter(
    (issue) => issue.reportedBy === session?.username
  );

  const locationsData = locations.map((location) => {
    const locationIssues = issues.filter(
      (issue) =>
        issue.location === location &&
        issue.status !== "Resolved"
    );

    return {
      location,
      count: locationIssues.length,
      critical: locationIssues.filter(
        (issue) => issue.priority >= 85
      ).length,
    };
  });

  const duplicateMatch = useMemo(() => {
    const title = normalizeText(form.title);

    if (title.length < 5) return null;

    return issues.find((issue) => {
      const existingTitle = normalizeText(issue.title);

      const sameCategory =
        issue.category === form.category;

      const sameLocation =
        issue.location === form.location;

      const words = title
        .split(" ")
        .filter((word) => word.length > 3);

      const sharedWords = words.filter((word) =>
        existingTitle.includes(word)
      );

      return (
        sameCategory &&
        sameLocation &&
        sharedWords.length >= Math.min(2, words.length)
      );
    });
  }, [
    form.title,
    form.category,
    form.location,
    issues,
  ]);

  function submitIssue(event) {
    event.preventDefault();

    if (!isStudent()) {
      showToast("Only students can submit issues.");
      return;
    }

    if (isSaving) return;

    if (!form.title.trim()) {
      showToast("Please enter an issue title.");
      return;
    }

    if (form.title.trim().length < 5) {
      showToast(
        "Issue title must contain at least 5 characters."
      );
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
      showToast(
        "Description cannot exceed 400 characters."
      );
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
      openIssue(duplicateMatch);
      return;
    }

    setIsSaving(true);

    setTimeout(() => {
      const newIssue = {
        id: `CF-${Math.floor(
          1000 + Math.random() * 8999
        )}`,
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        location: form.location,
        urgency: form.urgency,
        affected: Number(form.affected),
        supportedBy: Number(form.affected),
        priority: priorityPreview,
        status: "Pending",
        team: getTeam(form.category),
        createdAt: "Just now",
        reportedBy: session.username,
      };

      setIssues((prev) => [newIssue, ...prev]);

      setIsSaving(false);
      resetForm();
      showToast("Issue submitted successfully.");
      openIssue(newIssue);
    }, 500);
  }

  function supportIssue(issueId) {
    if (!isStudent()) {
      showToast(
        "Please use a student account to support issues."
      );
      return;
    }

    setIssues((prev) =>
      prev.map((issue) => {
        if (issue.id !== issueId) return issue;

        const affected =
          Number(issue.affected || 0) + 1;

        return {
          ...issue,
          affected,
          supportedBy:
            Number(issue.supportedBy || 0) + 1,
          priority: calculatePriority(
            issue.urgency,
            affected,
            issue.category,
            issue.location
          ),
        };
      })
    );

    setSelectedIssue((prev) => {
      if (!prev || prev.id !== issueId) return prev;

      const affected =
        Number(prev.affected || 0) + 1;

      return {
        ...prev,
        affected,
        supportedBy:
          Number(prev.supportedBy || 0) + 1,
        priority: calculatePriority(
          prev.urgency,
          affected,
          prev.category,
          prev.location
        ),
      };
    });

    showToast(
      "Your support was added to this issue."
    );
  }

  function updateStatus(issueId, status) {
    if (!isAdmin()) {
      showToast(
        "Admin access is required to change issue status."
      );
      return;
    }

    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId
          ? {
              ...issue,
              status,
            }
          : issue
      )
    );

    setSelectedIssue((prev) => {
      if (!prev || prev.id !== issueId) return prev;

      return {
        ...prev,
        status,
      };
    });

    showToast(`Issue marked as ${status}.`);
  }

  function openIssue(issue) {
    setSelectedIssue(issue);
    setScreen("details");
  }

  function goTo(screenName) {
    if (
      screenName === "report" &&
      !isStudent()
    ) {
      showToast(
        "Only student accounts can report issues."
      );
      return;
    }

    if (
      screenName === "admin" &&
      !isAdmin()
    ) {
      showToast(
        "Admin login required."
      );
      return;
    }

    setScreen(screenName);
    setSelectedIssue(null);
    setShowAdmin(false);
  }

  function filteredIssues() {
    const query = normalizeText(search);

    let result = sortedIssues;

    if (query) {
      result = result.filter((issue) =>
        normalizeText(
          `${issue.id} ${issue.title} ${issue.category} ${issue.location} ${issue.status}`
        ).includes(query)
      );
    }

    return result;
  }

  /* =========================
     LOGIN SCREEN
  ========================= */

  if (!session) {
    if (!loginRole) {
      return (
        <div className="auth-shell">
          <div className="auth-decoration auth-decoration-one"></div>
          <div className="auth-decoration auth-decoration-two"></div>

          <div className="auth-brand">
            <div className="brand-mark large">
              CF
            </div>

            <div>
              <strong>CampusFix</strong>
              <span>
                Smart Campus Resolution
              </span>
            </div>
          </div>

          <div className="role-selection">
            <div className="auth-heading">
              <span className="eyebrow">
                CAMPUS ACCESS
              </span>

              <h1>
                Welcome to CampusFix
              </h1>

              <p>
                Choose your account type to continue.
              </p>
            </div>

            <div className="role-grid">
              <button
                className="role-card"
                onClick={() =>
                  setLoginRole("student")
                }
              >
                <div className="role-icon student-icon">
                  ♙
                </div>

                <div>
                  <span className="role-label">
                    STUDENT
                  </span>

                  <h2>
                    Student Login
                  </h2>

                  <p>
                    Report issues, support existing
                    problems and track your requests.
                  </p>
                </div>

                <span className="role-arrow">
                  →
                </span>
              </button>

              <button
                className="role-card admin-role-card"
                onClick={() =>
                  setLoginRole("admin")
                }
              >
                <div className="role-icon admin-icon">
                  ◈
                </div>

                <div>
                  <span className="role-label">
                    ADMIN / STAFF
                  </span>

                  <h2>
                    Admin Login
                  </h2>

                  <p>
                    Review priority issues, assign teams
                    and manage resolution status.
                  </p>
                </div>

                <span className="role-arrow">
                  →
                </span>
              </button>
            </div>

            <div className="auth-note">
              <span>🔒</span>
              Separate role-based access protects
              administrative actions.
            </div>
          </div>

          <div className="auth-footer">
            CampusFix • Hackathon Demo
          </div>
        </div>
      );
    }

    return (
      <div className="auth-shell">
        <div className="auth-decoration auth-decoration-one"></div>
        <div className="auth-decoration auth-decoration-two"></div>

        <div className="auth-brand">
          <div className="brand-mark large">
            CF
          </div>

          <div>
            <strong>CampusFix</strong>
            <span>
              Smart Campus Resolution
            </span>
          </div>
        </div>

        <div className="login-card">
          <button
            className="back-login"
            onClick={() => {
              setLoginRole(null);
              setLoginError("");
            }}
          >
            ← Choose another account
          </button>

          <div className="login-role-icon">
            {loginRole === "admin" ? "◈" : "♙"}
          </div>

          <span className="eyebrow">
            {loginRole === "admin"
              ? "ADMIN ACCESS"
              : "STUDENT ACCESS"}
          </span>

          <h1>
            {loginRole === "admin"
              ? "Admin Login"
              : "Student Login"}
          </h1>

          <p>
            {loginRole === "admin"
              ? "Authorized staff can manage campus issue resolution."
              : "Sign in to report and support campus issues."}
          </p>

          <form
            className="login-form"
            onSubmit={handleLogin}
          >
            <label>
              {loginRole === "admin"
                ? "Admin ID"
                : "Student ID"}
            </label>

            <input
              type="text"
              value={loginForm.username}
              onChange={(e) =>
                handleLoginChange(
                  "username",
                  e.target.value
                )
              }
              placeholder={
                loginRole === "admin"
                  ? "Enter admin ID"
                  : "Enter student ID"
              }
              autoComplete="username"
            />

            <label>Password</label>

            <input
              type="password"
              value={loginForm.password}
              onChange={(e) =>
                handleLoginChange(
                  "password",
                  e.target.value
                )
              }
              placeholder="Enter password"
              autoComplete="current-password"
            />

            {loginError && (
              <div className="login-error">
                <span>!</span>
                {loginError}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
            >
              Sign in →
            </button>
          </form>

          <div className="demo-credentials">
            <span>DEMO CREDENTIALS</span>

            {loginRole === "admin" ? (
              <p>
                Admin ID: <strong>admin01</strong>
                <br />
                Password:{" "}
                <strong>admin123</strong>
              </p>
            ) : (
              <p>
                Student ID:{" "}
                <strong>student01</strong>
                <br />
                Password:{" "}
                <strong>student123</strong>
              </p>
            )}
          </div>
        </div>

        <div className="auth-footer">
          CampusFix • Role Protected Demo
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-screen">
        <div className="loading-logo">
          CF
        </div>

        <div className="spinner"></div>

        <h2>
          Loading CampusFix
        </h2>

        <p>
          Restoring your campus issue workspace...
        </p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {!isOnline && (
        <div className="offline-banner">
          <span>●</span>
          You are offline — CampusFix is
          saving changes locally.
        </div>
      )}

      {toast && (
        <div className="toast">
          {toast}
        </div>
      )}

      <header className="navbar">
        <div
          className="brand"
          onClick={() => goTo("dashboard")}
        >
          <div className="brand-mark">
            CF
          </div>

          <div>
            <strong>CampusFix</strong>
            <span>
              Smart Campus Resolution
            </span>
          </div>
        </div>

        <nav>
          <button
            className={
              screen === "dashboard"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              goTo("dashboard")
            }
          >
            Dashboard
          </button>

          {isStudent() && (
            <button
              className={
                screen === "report"
                  ? "nav-active"
                  : ""
              }
              onClick={() =>
                goTo("report")
              }
            >
              Report Issue
            </button>
          )}

          <button
            className={
              screen === "issues"
                ? "nav-active"
                : ""
            }
            onClick={() =>
              goTo("issues")
            }
          >
            {isAdmin()
              ? "All Issues"
              : "My Issues"}
          </button>

          <button
            onClick={() => {
              goTo("dashboard");

              setTimeout(() => {
                document
                  .getElementById(
                    "campus-pulse"
                  )
                  ?.scrollIntoView({
                    behavior: "smooth",
                  });
              }, 50);
            }}
          >
            Campus Pulse
          </button>
        </nav>

        <div className="nav-right">
          <span
            className={`connection ${
              isOnline
                ? "online"
                : "offline"
            }`}
          >
            <span></span>
            {isOnline
              ? "Live"
              : "Offline"}
          </span>

          <div
            className={`role-chip ${
              isAdmin()
                ? "admin-chip"
                : "student-chip"
            }`}
          >
            {isAdmin()
              ? "ADMIN"
              : "STUDENT"}
          </div>

          <div className="avatar">
            {isAdmin() ? "A" : "R"}
          </div>

          <button
            className="logout-button"
            onClick={logout}
          >
            Logout
          </button>
        </div>
      </header>

      {showAdmin && isAdmin() && (
        <section className="admin-panel">
          <div>
            <span className="eyebrow">
              ADMIN ACTION CENTER
            </span>

            <h2>
              Resolve the highest-impact
              problems first.
            </h2>

            <p>
              Issues are ranked using urgency,
              affected students, category and
              campus location.
            </p>
          </div>

          <div className="admin-summary">
            <div>
              <strong>
                {criticalIssues.length}
              </strong>

              <span>Critical</span>
            </div>

            <div>
              <strong>
                {activeIssues.length}
              </strong>

              <span>Active</span>
            </div>

            <div>
              <strong>
                {resolvedIssues.length}
              </strong>

              <span>Resolved</span>
            </div>
          </div>
        </section>
      )}

      {screen === "dashboard" && (
        <main>
          <section className="hero">
            <div className="hero-content">
              <div>
                <span className="eyebrow hero-eyebrow">
                  CAMPUS PULSE •{" "}
                  {isOnline
                    ? "SYSTEM ONLINE"
                    : "OFFLINE MODE"}
                </span>

                <h1>
                  Good morning,{" "}
                  {isAdmin()
                    ? "Admin."
                    : "Student."}
                </h1>

                <p>
                  {isAdmin()
                    ? "Monitor campus problems, prioritize urgent issues and move them toward resolution."
                    : "See what needs attention across campus and help turn individual complaints into collective action."}
                </p>

                <div className="hero-actions">
                  {isStudent() && (
                    <button
                      className="primary-button"
                      onClick={() =>
                        goTo("report")
                      }
                    >
                      + Report a New Issue
                    </button>
                  )}

                  {isAdmin() && (
                    <button
                      className="primary-button"
                      onClick={() => {
                        setShowAdmin(true);
                      }}
                    >
                      ◈ Open Admin Center
                    </button>
                  )}

                  <button
                    className="secondary-button"
                    onClick={() =>
                      goTo("issues")
                    }
                  >
                    {isAdmin()
                      ? "Manage All Issues →"
                      : "View My Issues →"}
                  </button>
                </div>
              </div>

              <div className="hero-orbit">
                <div className="orbit-ring ring-one"></div>
                <div className="orbit-ring ring-two"></div>

                <div className="orbit-center">
                  <strong>
                    {activeIssues.length}
                  </strong>

                  <span>
                    active issues
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="page-container">
            <div className="section-heading">
              <div>
                <span className="eyebrow">
                  OVERVIEW
                </span>

                <h2>
                  Campus Pulse
                </h2>
              </div>

              <span className="updated-text">
                {issues.length} total reports
              </span>
            </div>

            <div className="stats-grid">
              <div className="stat-card critical-stat">
                <span className="stat-icon">
                  !
                </span>

                <div>
                  <strong>
                    {criticalIssues.length}
                  </strong>

                  <span>
                    Critical Issues
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  ◈
                </span>

                <div>
                  <strong>
                    {activeIssues.length}
                  </strong>

                  <span>
                    Active Issues
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  ✓
                </span>

                <div>
                  <strong>
                    {resolvedIssues.length}
                  </strong>

                  <span>
                    Resolved
                  </span>
                </div>
              </div>

              <div className="stat-card">
                <span className="stat-icon">
                  ◎
                </span>

                <div>
                  <strong>
                    {totalAffected}
                  </strong>

                  <span>
                    Students Affected
                  </span>
                </div>
              </div>
            </div>

            <div className="dashboard-grid">
              <section className="panel priority-panel">
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      SMART PRIORITY
                    </span>

                    <h2>
                      Needs Attention
                    </h2>
                  </div>

                  <button
                    className="text-button"
                    onClick={() =>
                      goTo("issues")
                    }
                  >
                    View all →
                  </button>
                </div>

                {sortedIssues
                  .slice(0, 3)
                  .map((issue) => (
                    <button
                      className="issue-card"
                      key={issue.id}
                      onClick={() =>
                        openIssue(issue)
                      }
                    >
                      <div className="issue-icon">
                        {getIcon(
                          issue.category
                        )}
                      </div>

                      <div className="issue-main">
                        <div className="issue-top">
                          <span className="issue-id">
                            {issue.id}
                          </span>

                          <span
                            className={`priority-badge ${
                              issue.priority >= 85
                                ? "critical"
                                : issue.priority >=
                                  70
                                ? "high"
                                : "medium"
                            }`}
                          >
                            {issue.priority}
                          </span>
                        </div>

                        <h3>
                          {issue.title}
                        </h3>

                        <p>
                          {issue.location} •{" "}
                          {issue.category} •{" "}
                          {issue.affected} affected
                        </p>

                        <div className="issue-bottom">
                          <span>
                            {issue.team}
                          </span>

                          <span
                            className={`status ${issue.status
                              .replaceAll(
                                " ",
                                "-"
                              )
                              .toLowerCase()}`}
                          >
                            {issue.status}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}

                {sortedIssues.length === 0 && (
                  <div className="empty-state compact">
                    <span>✓</span>

                    <h3>
                      No active issues
                    </h3>

                    <p>
                      Campus is looking good.
                    </p>
                  </div>
                )}
              </section>

              <section
                className="panel map-panel"
                id="campus-pulse"
              >
                <div className="panel-heading">
                  <div>
                    <span className="eyebrow">
                      LIVE SIGNAL
                    </span>

                    <h2>
                      Campus Pulse Map
                    </h2>
                  </div>

                  <span className="map-live">
                    ● LIVE
                  </span>
                </div>

                <div className="campus-map">
                  <div className="map-road road-one"></div>
                  <div className="map-road road-two"></div>

                  {locationsData.map(
                    (item, index) => {
                      const positions = [
                        "building-a",
                        "building-b",
                        "building-c",
                        "building-d",
                        "building-e",
                        "building-f",
                        "building-g",
                        "building-h",
                      ];

                      return (
                        <button
                          key={
                            item.location
                          }
                          className={`map-building ${
                            positions[index]
                          } ${
                            item.critical
                              ? "map-critical"
                              : item.count
                              ? "map-active"
                              : ""
                          }`}
                          onClick={() => {
                            setSearch(
                              item.location
                            );
                            goTo("issues");
                          }}
                        >
                          <span>
                            {item.location.replace(
                              "Hostel ",
                              "H"
                            )}
                          </span>

                          {item.count > 0 && (
                            <b>
                              {item.count}
                            </b>
                          )}
                        </button>
                      );
                    }
                  )}

                  <div className="map-legend">
                    <span>
                      <i className="legend-dot critical-dot"></i>
                      Critical
                    </span>

                    <span>
                      <i className="legend-dot active-dot"></i>
                      Active
                    </span>

                    <span>
                      <i className="legend-dot normal-dot"></i>
                      Clear
                    </span>
                  </div>
                </div>
              </section>
            </div>

            <section className="community-panel">
              <div className="community-copy">
                <span className="eyebrow">
                  COMMUNITY SIGNAL
                </span>

                <h2>
                  One problem. Many voices.
                </h2>

                <p>
                  Instead of creating duplicate
                  complaints, students can support
                  an existing issue. Every
                  additional supporter increases
                  its impact score.
                </p>
              </div>

              {sortedIssues[0] && (
                <div className="community-feature">
                  <div className="community-icon">
                    {getIcon(
                      sortedIssues[0].category
                    )}
                  </div>

                  <div>
                    <span>
                      {sortedIssues[0].id}
                    </span>

                    <h3>
                      {sortedIssues[0].title}
                    </h3>

                    <p>
                      {sortedIssues[0].affected}{" "}
                      students affected •
                      Priority{" "}
                      {sortedIssues[0].priority}
                    </p>
                  </div>

                  {isStudent() ? (
                    <button
                      className="support-button"
                      onClick={() =>
                        supportIssue(
                          sortedIssues[0].id
                        )
                      }
                    >
                      I'm affected too +
                    </button>
                  ) : (
                    <span className="admin-view-label">
                      Admin monitoring
                    </span>
                  )}
                </div>
              )}
            </section>
          </section>
        </main>
      )}

      {screen === "report" &&
        isStudent() && (
          <main className="page-container report-page">
            <div className="page-title">
              <span className="eyebrow">
                SMART REPORTING
              </span>

              <h1>
                Report a Campus Issue
              </h1>

              <p>
                Tell us what happened. CampusFix
                will calculate the priority
                automatically.
              </p>
            </div>

            <div className="report-layout">
              <form
                className="report-form panel"
                onSubmit={submitIssue}
              >
                <div className="form-section">
                  <label>
                    Issue title
                    <span>*</span>
                  </label>

                  <input
                    type="text"
                    value={form.title}
                    maxLength={80}
                    onChange={(e) =>
                      updateForm(
                        "title",
                        e.target.value
                      )
                    }
                    placeholder="e.g. Wi-Fi not working in Computer Lab"
                  />

                  <div className="character-count">
                    {form.title.length}/80
                  </div>
                </div>

                <div className="form-section">
                  <label>
                    Description
                    <span>*</span>
                  </label>

                  <textarea
                    value={
                      form.description
                    }
                    maxLength={400}
                    onChange={(e) =>
                      updateForm(
                        "description",
                        e.target.value
                      )
                    }
                    placeholder="Explain what is happening and how it affects students..."
                  />

                  <div className="character-count">
                    {form.description.length}
                    /400
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-section">
                    <label>
                      Category
                    </label>

                    <select
                      value={
                        form.category
                      }
                      onChange={(e) =>
                        updateForm(
                          "category",
                          e.target.value
                        )
                      }
                    >
                      {categories.map(
                        (category) => (
                          <option
                            key={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  <div className="form-section">
                    <label>
                      Location
                    </label>

                    <select
                      value={
                        form.location
                      }
                      onChange={(e) =>
                        updateForm(
                          "location",
                          e.target.value
                        )
                      }
                    >
                      {locations.map(
                        (location) => (
                          <option
                            key={location}
                          >
                            {location}
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-section">
                    <label>
                      Urgency
                    </label>

                    <div className="urgency-grid">
                      {[
                        "Low",
                        "Medium",
                        "High",
                        "Critical",
                      ].map(
                        (urgency) => (
                          <button
                            type="button"
                            key={urgency}
                            className={
                              form.urgency ===
                              urgency
                                ? `urgency-option selected ${urgency.toLowerCase()}`
                                : "urgency-option"
                            }
                            onClick={() =>
                              updateForm(
                                "urgency",
                                urgency
                              )
                            }
                          >
                            {urgency}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  <div className="form-section">
                    <label>
                      Students affected
                    </label>

                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={
                        form.affected
                      }
                      onChange={(e) =>
                        updateForm(
                          "affected",
                          Math.max(
                            1,
                            Number(
                              e.target.value
                            )
                          )
                        )
                      }
                    />
                  </div>
                </div>

                {duplicateMatch && (
                  <div className="duplicate-warning">
                    <strong>
                      Similar issue detected
                    </strong>

                    <p>
                      {duplicateMatch.id} —{" "}
                      {duplicateMatch.title}
                    </p>

                    <small>
                      Supporting the existing issue
                      avoids duplicate reports and
                      increases its community signal.
                    </small>

                    <button
                      type="button"
                      onClick={() =>
                        openIssue(
                          duplicateMatch
                        )
                      }
                    >
                      View existing issue →
                    </button>
                  </div>
                )}

                <button
                  className="submit-button"
                  type="submit"
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <>
                      <span className="button-spinner"></span>
                      Processing...
                    </>
                  ) : (
                    "Submit Issue →"
                  )}
                </button>
              </form>

              <aside className="priority-preview panel">
                <span className="eyebrow">
                  AI-ASSISTED PRIORITY
                </span>

                <h2>
                  Smart Priority Score
                </h2>

                <div className="score-circle">
                  <strong>
                    {priorityPreview}
                  </strong>

                  <span>
                    /100
                  </span>
                </div>

                <div className="score-label">
                  <span>
                    Priority
                  </span>

                  <strong>
                    {priorityLabel(
                      priorityPreview
                    )}
                  </strong>
                </div>

                <div className="score-breakdown">
                  <div>
                    <span>
                      Urgency
                    </span>

                    <strong>
                      {form.urgency ===
                      "Critical"
                        ? 40
                        : form.urgency ===
                          "High"
                        ? 35
                        : form.urgency ===
                          "Medium"
                        ? 25
                        : 10}
                      /40
                    </strong>
                  </div>

                  <div>
                    <span>
                      Students affected
                    </span>

                    <strong>
                      {Math.min(
                        Math.round(
                          Number(
                            form.affected
                          ) * 0.75
                        ),
                        30
                      )}
                      /30
                    </strong>
                  </div>

                  <div>
                    <span>
                      Category impact
                    </span>

                    <strong>
                      {form.category ===
                        "Electricity" ||
                      form.category ===
                        "Water" ||
                      form.category ===
                        "Security"
                        ? 20
                        : form.category ===
                          "Wi-Fi"
                        ? 18
                        : 12}
                      /20
                    </strong>
                  </div>

                  <div>
                    <span>
                      Location impact
                    </span>

                    <strong>
                      7/10
                    </strong>
                  </div>
                </div>

                <div className="team-recommendation">
                  <span>
                    Recommended team
                  </span>

                  <strong>
                    {getTeam(
                      form.category
                    )}
                  </strong>
                </div>
              </aside>
            </div>
          </main>
        )}

      {screen === "issues" && (
        <main className="page-container issues-page">
          <div className="page-title">
            <span className="eyebrow">
              {isAdmin()
                ? "ADMIN ISSUE CENTER"
                : "ISSUE CENTER"}
            </span>

            <h1>
              {isAdmin()
                ? "All Campus Issues"
                : "My Campus Issues"}
            </h1>

            <p>
              {isAdmin()
                ? "Review, prioritize and manage campus issue resolution."
                : "Search, support and track campus problems."}
            </p>
          </div>

          <div className="search-bar">
            <span>⌕</span>

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search by issue, ID, category, location..."
            />

            {search && (
              <button
                onClick={() =>
                  setSearch("")
                }
              >
                Clear
              </button>
            )}
          </div>

          <div className="issue-results-header">
            <span>
              Showing{" "}
              <strong>
                {filteredIssues().length}
              </strong>{" "}
              issues
            </span>

            <span>
              Sorted by smart priority
            </span>
          </div>

          <div className="issue-list">
            {filteredIssues().map(
              (issue) => (
                <article
                  className="full-issue-card panel"
                  key={issue.id}
                >
                  <div className="full-issue-icon">
                    {getIcon(
                      issue.category
                    )}
                  </div>

                  <div className="full-issue-content">
                    <div className="issue-top">
                      <span className="issue-id">
                        {issue.id}
                      </span>

                      <span
                        className={`priority-badge ${
                          issue.priority >= 85
                            ? "critical"
                            : issue.priority >=
                              70
                            ? "high"
                            : "medium"
                        }`}
                      >
                        Priority{" "}
                        {issue.priority}
                      </span>
                    </div>

                    <h2>
                      {issue.title}
                    </h2>

                    <p>
                      {issue.description}
                    </p>

                    <div className="issue-meta">
                      <span>
                        ⌖{" "}
                        {issue.location}
                      </span>

                      <span>
                        ◉{" "}
                        {issue.affected}{" "}
                        affected
                      </span>

                      <span>
                        ⚙{" "}
                        {issue.team}
                      </span>

                      <span className="status">
                        {issue.status}
                      </span>
                    </div>
                  </div>

                  <div className="issue-actions">
                    <button
                      className="small-secondary"
                      onClick={() =>
                        openIssue(issue)
                      }
                    >
                      Details
                    </button>

                    {isStudent() &&
                      issue.status !==
                        "Resolved" && (
                        <button
                          className="small-primary"
                          onClick={() =>
                            supportIssue(
                              issue.id
                            )
                          }
                        >
                          I'm affected too
                        </button>
                      )}
                  </div>
                </article>
              )
            )}

            {filteredIssues().length ===
              0 && (
              <div className="empty-state">
                <span>⌕</span>

                <h2>
                  No issues found
                </h2>

                <p>
                  Try another search term or
                  report a new campus issue.
                </p>

                {isStudent() && (
                  <button
                    className="primary-button"
                    onClick={() =>
                      goTo("report")
                    }
                  >
                    Report an Issue
                  </button>
                )}
              </div>
            )}
          </div>
        </main>
      )}

      {screen === "details" &&
        selectedIssue && (
          <main className="page-container details-page">
            <button
              className="back-button"
              onClick={() =>
                goTo("issues")
              }
            >
              ← Back to Issues
            </button>

            <div className="details-header">
              <div>
                <span className="eyebrow">
                  {selectedIssue.id} • ISSUE DETAILS
                </span>

                <h1>
                  {selectedIssue.title}
                </h1>

                <p>
                  {selectedIssue.location} •{" "}
                  {selectedIssue.category} •{" "}
                  {selectedIssue.affected}{" "}
                  students affected
                </p>
              </div>

              <div className="detail-score">
                <span>
                  Priority
                </span>

                <strong>
                  {selectedIssue.priority}
                </strong>

                <small>
                  {priorityLabel(
                    selectedIssue.priority
                  )}
                </small>
              </div>
            </div>

            <div className="details-grid">
              <section className="panel detail-main">
                <span className="eyebrow">
                  REPORT
                </span>

                <h2>
                  What is happening?
                </h2>

                <p className="detail-description">
                  {
                    selectedIssue.description
                  }
                </p>

                <div className="detail-info-grid">
                  <div>
                    <span>
                      Category
                    </span>

                    <strong>
                      {
                        selectedIssue.category
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Location
                    </span>

                    <strong>
                      {
                        selectedIssue.location
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Urgency
                    </span>

                    <strong>
                      {
                        selectedIssue.urgency
                      }
                    </strong>
                  </div>

                  <div>
                    <span>
                      Assigned Team
                    </span>

                    <strong>
                      {
                        selectedIssue.team
                      }
                    </strong>
                  </div>
                </div>

                {isStudent() && (
                  <div className="community-action">
                    <div>
                      <strong>
                        {
                          selectedIssue.affected
                        }
                      </strong>

                      <span>
                        students affected
                      </span>
                    </div>

                    <button
                      className="support-button"
                      disabled={
                        selectedIssue.status ===
                        "Resolved"
                      }
                      onClick={() =>
                        supportIssue(
                          selectedIssue.id
                        )
                      }
                    >
                      I'm affected too +
                    </button>
                  </div>
                )}

                {isAdmin() && (
                  <div className="admin-protection-note">
                    <span>
                      🔒
                    </span>

                    <div>
                      <strong>
                        Admin controls enabled
                      </strong>

                      <p>
                        You are signed in as an
                        authorized administrator.
                      </p>
                    </div>
                  </div>
                )}
              </section>

              <aside className="panel timeline-panel">
                <span className="eyebrow">
                  PROGRESS
                </span>

                <h2>
                  Issue Timeline
                </h2>

                <div className="timeline">
                  {statuses.map(
                    (status, index) => {
                      const currentIndex =
                        statusIndex(
                          selectedIssue.status
                        );

                      return (
                        <div
                          key={status}
                          className={`timeline-item ${
                            index <=
                            currentIndex
                              ? "completed"
                              : ""
                          } ${
                            index ===
                            currentIndex
                              ? "current"
                              : ""
                          }`}
                        >
                          <div className="timeline-dot">
                            {index <=
                            currentIndex
                              ? "✓"
                              : ""}
                          </div>

                          <div>
                            <strong>
                              {status}
                            </strong>

                            {index ===
                              currentIndex && (
                              <span>
                                Current status
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }
                  )}
                </div>
              </aside>
            </div>

            {isAdmin() && (
              <section className="panel admin-action">
                <div>
                  <span className="eyebrow">
                    ADMIN ACTION CENTER
                  </span>

                  <h2>
                    Update resolution status
                  </h2>

                  <p>
                    Only authenticated administrators
                    can move issues through the
                    resolution workflow.
                  </p>
                </div>

                <select
                  value={
                    selectedIssue.status
                  }
                  onChange={(e) =>
                    updateStatus(
                      selectedIssue.id,
                      e.target.value
                    )
                  }
                >
                  {statuses.map(
                    (status) => (
                      <option
                        key={status}
                      >
                        {status}
                      </option>
                    )
                  )}
                </select>
              </section>
            )}

            {!isAdmin() && (
              <section className="student-status-note">
                <span>
                  🔒
                </span>

                <div>
                  <strong>
                    Status updates are managed by CampusFix administrators.
                  </strong>

                  <p>
                    You can view the progress but only
                    authorized staff can change it.
                  </p>
                </div>
              </section>
            )}
          </main>
        )}

      <footer>
        <div>
          <strong>
            CampusFix
          </strong>

          <span>
            Smart campus issue resolution
          </span>
        </div>

        <span>
          {isAdmin()
            ? "Administrator Mode"
            : "Student Mode"}{" "}
          • Hackathon Demo
        </span>
      </footer>
    </div>
  );
}

export default App;