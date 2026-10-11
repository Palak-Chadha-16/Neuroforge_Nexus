
import { useEffect, useState } from "react";
import {
  PiUserCircle,
  PiBell,
  PiPaintBrush,
  PiShieldCheck,
  PiBug,
  PiUsersThree,
  PiFloppyDisk,
  PiArrowCounterClockwise,
  PiSun,
  PiMoon,
  PiCheckCircle,
  PiInfo,
  PiEnvelopeSimple,
  PiLockKey,
  PiMonitor,
  PiGearSix,
} from "react-icons/pi";

import "./Settings.css";

const STORAGE_KEY = "neuroforge-settings";

const defaultSettings = {
  profile: {
    name: "",
    email: "",
    role: "Developer",
    bio: "",
  },

  notifications: {
    taskAssignments: true,
    bugUpdates: true,
    comments: true,
    mentions: true,
    deadlines: true,
    emailNotifications: false,
    weeklySummary: true,
  },

  appearance: {
    theme: "light",
    accentColor: "#6c63ff",
    compactMode: false,
  },

  testing: {
    defaultSeverity: "Medium",
    defaultPriority: "Medium",
    defaultStatus: "Open",
    defaultEnvironment: "Development",
    autoAssign: false,
  },

  workspace: {
    workspaceName: "NeuroForge Nexus",
    timezone: "Asia/Kolkata",
    language: "English",
  },
};

const sections = [
  {
    id: "profile",
    label: "My Profile",
    description: "Personal information",
    icon: PiUserCircle,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alerts and reminders",
    icon: PiBell,
  },
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme and display",
    icon: PiPaintBrush,
  },
  {
    id: "security",
    label: "Security",
    description: "Password and account",
    icon: PiShieldCheck,
  },
  {
    id: "testing",
    label: "Testing Preferences",
    description: "Default bug settings",
    icon: PiBug,
  },
  {
    id: "workspace",
    label: "Workspace & Team",
    description: "Workspace preferences",
    icon: PiUsersThree,
  },
];

function loadSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return defaultSettings;

    const parsed = JSON.parse(stored);

    return {
      ...defaultSettings,
      ...parsed,
      profile: {
        ...defaultSettings.profile,
        ...parsed.profile,
      },
      notifications: {
        ...defaultSettings.notifications,
        ...parsed.notifications,
      },
      appearance: {
        ...defaultSettings.appearance,
        ...parsed.appearance,
      },
      testing: {
        ...defaultSettings.testing,
        ...parsed.testing,
      },
      workspace: {
        ...defaultSettings.workspace,
        ...parsed.workspace,
      },
    };
  } catch {
    return defaultSettings;
  }
}

function Settings() {
  const [activeSection, setActiveSection] = useState("profile");
  const [settings, setSettings] = useState(loadSettings);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--settings-accent",
      settings.appearance.accentColor
    );
  }, [settings.appearance.accentColor]);

  const updateSection = (section, key, value) => {
    setSettings((previous) => ({
      ...previous,
      [section]: {
        ...previous[section],
        [key]: value,
      },
    }));

    setSaved(false);
    setMessage("");
  };

  const saveSettings = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      setSaved(true);
      setMessage("Your preferences have been saved on this device.");
    } catch {
      setSaved(false);
      setMessage("Unable to save settings in this browser.");
    }
  };

  const resetSettings = () => {
    const confirmed = window.confirm(
      "Reset all settings to their default values?"
    );

    if (!confirmed) return;

    setSettings(defaultSettings);
    localStorage.removeItem(STORAGE_KEY);
    setPasswordForm({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setSaved(false);
    setMessage("Settings have been reset.");
  };

  const handlePasswordSubmit = (event) => {
    event.preventDefault();

    if (
      !passwordForm.currentPassword ||
      !passwordForm.newPassword ||
      !passwordForm.confirmPassword
    ) {
      setMessage("Please fill in all password fields.");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setMessage("Your new password must contain at least 8 characters.");
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage("The new passwords do not match.");
      return;
    }

    setMessage(
      "The form is valid, but password changes are not connected to the backend yet."
    );
  };

  const activeItem = sections.find(
    (section) => section.id === activeSection
  );

  const profileInitials =
    settings.profile.name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "NF";

  return (
    <div
      className={`settings-page ${
        settings.appearance.theme === "dark" ? "settings-dark" : ""
      } ${settings.appearance.compactMode ? "settings-compact" : ""}`}
      style={{ "--settings-accent": settings.appearance.accentColor }}
    >
      {/* Page header */}
      <header className="settings-header">
        <div className="settings-heading">
          <div className="settings-heading-icon">
            <PiGearSix />
          </div>

          <div>
            <div className="settings-eyebrow">PREFERENCES</div>
            <h1>Settings</h1>
            <p>Manage your account, workspace and application preferences.</p>
          </div>
        </div>

        <div className="settings-header-actions">
          <button
            type="button"
            className="settings-btn settings-btn-secondary"
            onClick={resetSettings}
          >
            <PiArrowCounterClockwise />
            Reset
          </button>

          <button
            type="button"
            className="settings-btn settings-btn-primary"
            onClick={saveSettings}
          >
            <PiFloppyDisk />
            Save changes
          </button>
        </div>
      </header>

      {/* Save feedback */}
      {message && (
        <div
          className={`settings-message ${
            saved ? "settings-message-success" : ""
          }`}
          role="status"
        >
          {saved ? <PiCheckCircle /> : <PiInfo />}
          <span>{message}</span>
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}

      <div className="settings-layout">
        {/* Settings navigation */}
        <aside className="settings-sidebar">
          <div className="settings-sidebar-title">SETTINGS MENU</div>

          <nav className="settings-nav" aria-label="Settings sections">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <button
                  key={section.id}
                  type="button"
                  className={`settings-nav-item ${
                    isActive ? "active" : ""
                  }`}
                  onClick={() => {
                    setActiveSection(section.id);
                    setMessage("");
                  }}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="settings-nav-icon">
                    <Icon />
                  </span>

                  <span className="settings-nav-copy">
                    <strong>{section.label}</strong>
                    <small>{section.description}</small>
                  </span>

                  {isActive && (
                    <span className="settings-nav-indicator" />
                  )}
                </button>
              );
            })}
          </nav>

          <div className="settings-sidebar-footer">
            <div className="settings-help-icon">
              <PiInfo />
            </div>
            <div>
              <strong>Need help?</strong>
              <p>Manage your preferences from one place.</p>
            </div>
          </div>
        </aside>

        {/* Settings content */}
        <main className="settings-content">
          <div className="settings-content-header">
            <div>
              <h2>{activeItem?.label}</h2>
              <p>{activeItem?.description}</p>
            </div>
            <span className="settings-section-badge">
              <PiCheckCircle />
              Preferences
            </span>
          </div>

          {/* PROFILE */}
          {activeSection === "profile" && (
            <div className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Profile information</h3>
                <p>Update the personal details displayed on your account.</p>
              </div>

              <div className="settings-profile-card">
                <div className="settings-avatar">{profileInitials}</div>
                <div className="settings-profile-summary">
                  <strong>
                    {settings.profile.name || "Your name"}
                  </strong>
                  <span>
                    {settings.profile.email || "your.email@example.com"}
                  </span>
                  <span className="settings-role-badge">
                    {settings.profile.role}
                  </span>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field">
                  <label htmlFor="profile-name">Full name</label>
                  <input
                    id="profile-name"
                    type="text"
                    placeholder="Enter your full name"
                    value={settings.profile.name}
                    onChange={(e) =>
                      updateSection("profile", "name", e.target.value)
                    }
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="profile-email">Email address</label>
                  <div className="settings-input-icon">
                    <PiEnvelopeSimple />
                    <input
                      id="profile-email"
                      type="email"
                      placeholder="you@example.com"
                      value={settings.profile.email}
                      onChange={(e) =>
                        updateSection("profile", "email", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="settings-field">
                  <label htmlFor="profile-role">Role</label>
                  <select
                    id="profile-role"
                    value={settings.profile.role}
                    onChange={(e) =>
                      updateSection("profile", "role", e.target.value)
                    }
                  >
                    <option>Developer</option>
                    <option>Tester</option>
                    <option>Project Manager</option>
                    <option>Admin</option>
                  </select>
                </div>

                <div className="settings-field settings-field-full">
                  <label htmlFor="profile-bio">Bio</label>
                  <textarea
                    id="profile-bio"
                    rows="4"
                    maxLength="300"
                    placeholder="Tell your team a little about yourself..."
                    value={settings.profile.bio}
                    onChange={(e) =>
                      updateSection("profile", "bio", e.target.value)
                    }
                  />
                  <small className="settings-field-hint">
                    {settings.profile.bio.length}/300 characters
                  </small>
                </div>
              </div>

              <div className="settings-note">
                <PiInfo />
                <span>
                  Profile changes are currently saved locally. Connect this
                  section to your profile API to update account information
                  across devices.
                </span>
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeSection === "notifications" && (
            <div className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Notification preferences</h3>
                <p>Choose which project activities you want to be notified about.</p>
              </div>

              <div className="settings-option-list">
                <ToggleOption
                  title="Task assignments"
                  description="When a task is assigned or reassigned to you."
                  checked={settings.notifications.taskAssignments}
                  onChange={(value) =>
                    updateSection("notifications", "taskAssignments", value)
                  }
                />

                <ToggleOption
                  title="Bug updates"
                  description="When a bug's status, severity or priority changes."
                  checked={settings.notifications.bugUpdates}
                  onChange={(value) =>
                    updateSection("notifications", "bugUpdates", value)
                  }
                />

                <ToggleOption
                  title="Comments and replies"
                  description="When someone comments on your tasks or reported bugs."
                  checked={settings.notifications.comments}
                  onChange={(value) =>
                    updateSection("notifications", "comments", value)
                  }
                />

                <ToggleOption
                  title="@Mentions"
                  description="When a teammate mentions you in a comment."
                  checked={settings.notifications.mentions}
                  onChange={(value) =>
                    updateSection("notifications", "mentions", value)
                  }
                />

                <ToggleOption
                  title="Deadline reminders"
                  description="Reminders for tasks that are approaching their due date."
                  checked={settings.notifications.deadlines}
                  onChange={(value) =>
                    updateSection("notifications", "deadlines", value)
                  }
                />

                <ToggleOption
                  title="Email notifications"
                  description="Receive supported project notifications by email."
                  checked={settings.notifications.emailNotifications}
                  onChange={(value) =>
                    updateSection("notifications", "emailNotifications", value)
                  }
                />

                <ToggleOption
                  title="Weekly summary"
                  description="A weekly overview of project activity and progress."
                  checked={settings.notifications.weeklySummary}
                  onChange={(value) =>
                    updateSection("notifications", "weeklySummary", value)
                  }
                />
              </div>

              <div className="settings-note">
                <PiInfo />
                <span>
                  These preferences are stored locally for now. Actual in-app
                  alerts, email delivery and deadline reminders need backend
                  notification support.
                </span>
              </div>
            </div>
          )}

          {/* APPEARANCE */}
          {activeSection === "appearance" && (
            <div className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Appearance and display</h3>
                <p>Personalize how your settings page looks.</p>
              </div>

              <div className="settings-subheading">
                <h4>Theme</h4>
                <p>Choose your preferred color scheme.</p>
              </div>

              <div className="settings-theme-options">
                <button
                  type="button"
                  className={`settings-theme-card ${
                    settings.appearance.theme === "light" ? "selected" : ""
                  }`}
                  onClick={() =>
                    updateSection("appearance", "theme", "light")
                  }
                >
                  <div className="settings-theme-preview theme-preview-light">
                    <div className="theme-preview-sidebar" />
                    <div className="theme-preview-content">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <span className="settings-theme-label">
                    <PiSun /> Light
                  </span>
                  {settings.appearance.theme === "light" && (
                    <PiCheckCircle className="settings-theme-check" />
                  )}
                </button>

                <button
                  type="button"
                  className={`settings-theme-card ${
                    settings.appearance.theme === "dark" ? "selected" : ""
                  }`}
                  onClick={() =>
                    updateSection("appearance", "theme", "dark")
                  }
                >
                  <div className="settings-theme-preview theme-preview-dark">
                    <div className="theme-preview-sidebar" />
                    <div className="theme-preview-content">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <span className="settings-theme-label">
                    <PiMoon /> Dark
                  </span>
                  {settings.appearance.theme === "dark" && (
                    <PiCheckCircle className="settings-theme-check" />
                  )}
                </button>
              </div>

              <div className="settings-divider" />

              <div className="settings-subheading">
                <h4>Accent color</h4>
                <p>Choose the highlight color for buttons and active elements.</p>
              </div>

              <div className="settings-color-options">
                {[
                  "#6c63ff",
                  "#2563eb",
                  "#0d9488",
                  "#e11d48",
                  "#d97706",
                  "#7c3aed",
                ].map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`settings-color-swatch ${
                      settings.appearance.accentColor === color
                        ? "selected"
                        : ""
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() =>
                      updateSection("appearance", "accentColor", color)
                    }
                    aria-label={`Choose accent color ${color}`}
                    aria-pressed={
                      settings.appearance.accentColor === color
                    }
                  >
                    {settings.appearance.accentColor === color && (
                      <PiCheckCircle />
                    )}
                  </button>
                ))}

                <label className="settings-custom-color">
                  <input
                    type="color"
                    value={settings.appearance.accentColor}
                    onChange={(e) =>
                      updateSection(
                        "appearance",
                        "accentColor",
                        e.target.value
                      )
                    }
                  />
                  <span>Custom</span>
                </label>
              </div>

              <div className="settings-divider" />

              <ToggleOption
                title="Compact layout"
                description="Reduce spacing between settings elements."
                checked={settings.appearance.compactMode}
                onChange={(value) =>
                  updateSection("appearance", "compactMode", value)
                }
              />

              <div className="settings-note">
                <PiInfo />
                <span>
                  The theme preview applies to this Settings page. To theme
                  the entire application, connect these preferences to your
                  global layout and theme provider.
                </span>
              </div>
            </div>
          )}

          {/* SECURITY */}
          {activeSection === "security" && (
            <div className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Account security</h3>
                <p>Review your account security and password options.</p>
              </div>

              <div className="settings-security-card">
                <div className="settings-security-icon">
                  <PiLockKey />
                </div>
                <div className="settings-security-copy">
                  <strong>Password protection</strong>
                  <p>
                    Keep your account secure by using a strong, unique password.
                  </p>
                </div>
                <span className="settings-security-status">
                  <PiShieldCheck /> Account
                </span>
              </div>

              <form
                className="settings-password-form"
                onSubmit={handlePasswordSubmit}
              >
                <h4>Change password</h4>

                <div className="settings-field">
                  <label htmlFor="current-password">Current password</label>
                  <input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    value={passwordForm.currentPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        currentPassword: e.target.value,
                      }))
                    }
                    placeholder="Enter current password"
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.newPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        newPassword: e.target.value,
                      }))
                    }
                    placeholder="At least 8 characters"
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="confirm-password">Confirm new password</label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) =>
                      setPasswordForm((prev) => ({
                        ...prev,
                        confirmPassword: e.target.value,
                      }))
                    }
                    placeholder="Re-enter new password"
                  />
                </div>

                <button
                  type="submit"
                  className="settings-btn settings-btn-primary"
                >
                  <PiLockKey /> Validate password form
                </button>
              </form>

              <div className="settings-note">
                <PiInfo />
                <span>
                  This form does not change your real password. Connect it to
                  a secure Spring Boot endpoint with authentication and
                  server-side password hashing before enabling password changes.
                </span>
              </div>

              <div className="settings-security-card settings-session-card">
                <div className="settings-security-icon">
                  <PiMonitor />
                </div>
                <div className="settings-security-copy">
                  <strong>Current session</strong>
                  <p>
                    You are using NeuroForge Nexus in this browser.
                  </p>
                </div>
                <span className="settings-session-badge">This device</span>
              </div>
            </div>
          )}

          {/* TESTING PREFERENCES */}
          {activeSection === "testing" && (
            <div className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Testing preferences</h3>
                <p>Set default values for new bug reports.</p>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field">
                  <label htmlFor="default-severity">Default severity</label>
                  <select
                    id="default-severity"
                    value={settings.testing.defaultSeverity}
                    onChange={(e) =>
                      updateSection("testing", "defaultSeverity", e.target.value)
                    }
                  >
                    <option>Critical</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <small className="settings-field-hint">
                    How seriously the bug affects the system.
                  </small>
                </div>

                <div className="settings-field">
                  <label htmlFor="default-priority">Default priority</label>
                  <select
                    id="default-priority"
                    value={settings.testing.defaultPriority}
                    onChange={(e) =>
                      updateSection("testing", "defaultPriority", e.target.value)
                    }
                  >
                    <option>Urgent</option>
                    <option>High</option>
                    <option>Medium</option>
                    <option>Low</option>
                  </select>
                  <small className="settings-field-hint">
                    How quickly the bug should be addressed.
                  </small>
                </div>

                <div className="settings-field">
                  <label htmlFor="default-status">Default bug status</label>
                  <select
                    id="default-status"
                    value={settings.testing.defaultStatus}
                    onChange={(e) =>
                      updateSection("testing", "defaultStatus", e.target.value)
                    }
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Resolved</option>
                    <option>Closed</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="default-environment">
                    Default environment
                  </label>
                  <select
                    id="default-environment"
                    value={settings.testing.defaultEnvironment}
                    onChange={(e) =>
                      updateSection(
                        "testing",
                        "defaultEnvironment",
                        e.target.value
                      )
                    }
                  >
                    <option>Development</option>
                    <option>Testing</option>
                    <option>Staging</option>
                    <option>Production</option>
                  </select>
                </div>
              </div>

              <div className="settings-divider" />

              <ToggleOption
                title="Suggest automatic assignment"
                description="Enable a preference for assigning new bugs automatically when supported."
                checked={settings.testing.autoAssign}
                onChange={(value) =>
                  updateSection("testing", "autoAssign", value)
                }
              />

              <div className="settings-note">
                <PiInfo />
                <span>
                  These are saved preferences only. Your bug-report form must
                  read these values to use them as defaults, and automatic
                  assignment requires backend logic.
                </span>
              </div>
            </div>
          )}

          {/* WORKSPACE */}
          {activeSection === "workspace" && (
            <div className="settings-panel">
              <div className="settings-panel-heading">
                <h3>Workspace preferences</h3>
                <p>Customize your workspace display and regional settings.</p>
              </div>

              <div className="settings-workspace-banner">
                <div className="settings-workspace-logo">NF</div>
                <div>
                  <strong>{settings.workspace.workspaceName}</strong>
                  <p>Project management and software testing workspace</p>
                </div>
              </div>

              <div className="settings-form-grid">
                <div className="settings-field settings-field-full">
                  <label htmlFor="workspace-name">Workspace name</label>
                  <input
                    id="workspace-name"
                    type="text"
                    value={settings.workspace.workspaceName}
                    onChange={(e) =>
                      updateSection("workspace", "workspaceName", e.target.value)
                    }
                    placeholder="Enter workspace name"
                  />
                </div>

                <div className="settings-field">
                  <label htmlFor="workspace-timezone">Time zone</label>
                  <select
                    id="workspace-timezone"
                    value={settings.workspace.timezone}
                    onChange={(e) =>
                      updateSection("workspace", "timezone", e.target.value)
                    }
                  >
                    <option value="Asia/Kolkata">
                      India Standard Time (IST)
                    </option>
                    <option value="UTC">Coordinated Universal Time (UTC)</option>
                    <option value="America/New_York">
                      Eastern Time
                    </option>
                    <option value="Europe/London">United Kingdom</option>
                  </select>
                </div>

                <div className="settings-field">
                  <label htmlFor="workspace-language">Language</label>
                  <select
                    id="workspace-language"
                    value={settings.workspace.language}
                    onChange={(e) =>
                      updateSection("workspace", "language", e.target.value)
                    }
                  >
                    <option>English</option>
                    <option>Hindi</option>
                  </select>
                </div>
              </div>

              <div className="settings-divider" />

              <div className="settings-team-info">
                <div className="settings-team-icon">
                  <PiUsersThree />
                </div>
                <div>
                  <h4>Team management</h4>
                  <p>
                    Manage members, permissions and team roles from your
                    workspace administration tools.
                  </p>
                  <span>
                    <PiInfo /> Team management API required
                  </span>
                </div>
              </div>

              <div className="settings-note">
                <PiInfo />
                <span>
                  Workspace preferences are saved locally. Team membership,
                  role permissions and shared workspace changes require
                  backend integration and appropriate authorization.
                </span>
              </div>
            </div>
          )}

          {/* Bottom actions */}
          <div className="settings-bottom-bar">
            <div className="settings-bottom-copy">
              <span className="settings-bottom-dot" />
              <span>
                {saved
                  ? "All changes saved"
                  : "You may have unsaved changes"}
              </span>
            </div>

            <button
              type="button"
              className="settings-btn settings-btn-primary"
              onClick={saveSettings}
            >
              <PiFloppyDisk />
              Save preferences
            </button>
          </div>

          <footer className="settings-footer">
            <span>NeuroForge Nexus</span>
            <span>Settings & Preferences</span>
          </footer>
        </main>
      </div>
    </div>
  );
}

function ToggleOption({ title, description, checked, onChange }) {
  return (
    <div className="settings-toggle-row">
      <div className="settings-toggle-copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={`settings-switch ${checked ? "switch-on" : ""}`}
        onClick={() => onChange(!checked)}
      >
        <span />
      </button>
    </div>
  );
}

export default Settings;