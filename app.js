import { cloudSyncEnabled, firebaseConfig } from "./firebase-config.js";

const STORAGE_KEY = "pixelTaskNexus::state";
const SESSION_KEY = "pixelTaskNexus::session";
const FLASH_TIMEOUT_MS = 2800;
const CLOUD_COLLECTION = "pixel_task_nexus";
const CLOUD_DOCUMENT = "workspace_main";

const appRoot = document.getElementById("app");

const STATUS_META = {
  bucket: { label: "Bucket", className: "status-bucket" },
  in_progress: { label: "In Progress", className: "status-in_progress" },
  blocked: { label: "Halted", className: "status-blocked" },
  done: { label: "Done", className: "status-done" },
};

const PRIORITY_META = {
  low: { label: "Low", className: "priority-low" },
  medium: { label: "Medium", className: "priority-medium" },
  high: { label: "High", className: "priority-high" },
};

const DEPENDENCY_META = {
  none: { label: "None", className: "dependency-none" },
  low: { label: "Low", className: "dependency-low" },
  medium: { label: "Medium", className: "dependency-medium" },
  high: { label: "High", className: "dependency-high" },
};

const DEPENDENCY_SCOPE_META = {
  none: { label: "None", className: "scope-none" },
  team: { label: "Internal Team", className: "scope-team" },
  external: { label: "External Team/Company", className: "scope-external" },
};

const BOARD_STATUSES = ["in_progress", "blocked", "done"];

const uiState = {
  selectedTaskId: null,
  loginError: "",
  flash: null,
  syncStatus: "local",
  syncMessage: "Local mode active. Configure Firebase to enable cross-device realtime sync.",
  statFilter: null, // null | "all" | "completed" | "my_active" | "unread_nudges"
};

const cloudState = {
  enabled: false,
  ready: false,
  docRef: null,
  setDocFn: null,
  unsubscribe: null,
  writeQueue: Promise.resolve(),
};

let flashTimerId = null;
let state = loadState();

appRoot.addEventListener("click", handleClick);
appRoot.addEventListener("submit", handleSubmit);
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && uiState.selectedTaskId) {
    uiState.selectedTaskId = null;
    render();
  }
});
window.addEventListener("beforeunload", () => {
  if (cloudState.unsubscribe) {
    cloudState.unsubscribe();
  }
});

render();
void initCloudSync();

function createSeedState() {
  const now = new Date();
  const iso = now.toISOString();
  const users = [
    {
      id: "u-rchan",
      name: "R Chandrashekar",
      username: "rchandrashekar",
      password: "rchandrashekar123",
      role: "admin",
    },
    {
      id: "u-shankar",
      name: "Shankar Ramamurthy",
      username: "shankar",
      password: "shankar123",
      role: "manager",
    },
    {
      id: "u-zeeshan",
      name: "Zeeshan Ahmad",
      username: "zeeshan",
      password: "zeeshan123",
      role: "member",
    },
    {
      id: "u-aishwarya",
      name: "Aishwarya Koli",
      username: "aishwarya",
      password: "aishwarya123",
      role: "member",
    },
    {
      id: "u-vegimanoj",
      name: "Vegimanoj Babu",
      username: "vegimanoj",
      password: "vegimanoj123",
      role: "member",
    },
    {
      id: "u-vaibhav",
      name: "Vaibhav Shewale",
      username: "vaibhav",
      password: "vaibhav123",
      role: "member",
    },
    {
      id: "u-ameya",
      name: "Ameya Kulkarni",
      username: "ameya",
      password: "ameya123",
      role: "member",
    },
    {
      id: "u-pawan",
      name: "Pawan Pandey",
      username: "pawan",
      password: "pawan123",
      role: "member",
    },
  ];

  const taskA = {
    id: "t-api-integration",
    title: "B2D API Integration for Sales Module",
    description: "Integrate the B2D Tech API with the Select Sales & Distribution module. Ensure all endpoints are tested and documented.",
    priority: "high",
    status: "in_progress",
    createdBy: "u-shankar",
    assignedTo: "u-vaibhav",
    dependencyFactor: "high",
    dependencyScope: "team",
    dependentOn: "u-shankar",
    externalDependencyName: "",
    dependencyNotes: "Needs lead approval on API contract before final integration push.",
    label: "Integration",
    involvement: [
      {
        id: "i-a-1",
        userId: "u-vaibhav",
        stars: 4,
        workSummary: "Leading the API integration design and implementation.",
        updatedAt: pastHours(3),
      },
      {
        id: "i-a-2",
        userId: "u-vaibhav",
        stars: 3,
        workSummary: "Developing endpoint handlers and writing unit tests.",
        updatedAt: pastHours(4),
      },
      {
        id: "i-a-3",
        userId: "u-shankar",
        stars: 2,
        workSummary: "Reviewing API contract and unblocking team queries.",
        updatedAt: pastHours(5),
      },
    ],
    dueDate: dateOffset(4),
    internalEstimate: estimateFromDetails("high", "api integration sales module"),
    comments: [
      {
        id: "c-a-1",
        userId: "u-vaibhav",
        body: "Auth token refresh logic is ready. Awaiting review from Vaibhav.",
        createdAt: pastHours(6),
      },
    ],
    history: [
      {
        id: "h-a-1",
        actorId: "u-shankar",
        message: "Task created and assigned to Vaibhav.",
        createdAt: pastHours(20),
      },
      {
        id: "h-a-2",
        actorId: "u-vaibhav",
        message: "Started work on integration layer.",
        createdAt: pastHours(10),
      },
    ],
    createdAt: pastHours(20),
    updatedAt: pastHours(3),
  };

  const taskB = {
    id: "t-product-roadmap",
    title: "Q2 Product Roadmap Review",
    description: "Consolidate inputs from all product managers and prepare the Q2 roadmap presentation for the Head of Digital.",
    priority: "high",
    status: "in_progress",
    createdBy: "u-shankar",
    assignedTo: "u-vegimanoj",
    dependencyFactor: "medium",
    dependencyScope: "team",
    dependentOn: "u-pawan",
    externalDependencyName: "",
    dependencyNotes: "Waiting on Pawan to submit the PM roadmap inputs before consolidation.",
    label: "Product",
    involvement: [
      {
        id: "i-b-1",
        userId: "u-vegimanoj",
        stars: 4,
        workSummary: "Driving the roadmap consolidation and deck preparation.",
        updatedAt: pastHours(2),
      },
      {
        id: "i-b-2",
        userId: "u-pawan",
        stars: 3,
        workSummary: "Compiling PM input and feature priority list.",
        updatedAt: pastHours(3),
      },
    ],
    dueDate: dateOffset(5),
    internalEstimate: estimateFromDetails("high", "q2 product roadmap review"),
    comments: [
      {
        id: "c-b-1",
        userId: "u-vegimanoj",
        body: "Draft deck is ready. Pawan, please send your section by EOD.",
        createdAt: pastHours(4),
      },
    ],
    history: [
      {
        id: "h-b-1",
        actorId: "u-shankar",
        message: "Task created and assigned to Vegimanoj.",
        createdAt: pastHours(16),
      },
    ],
    createdAt: pastHours(16),
    updatedAt: pastHours(2),
  };

  const taskC = {
    id: "t-compliance-api",
    title: "External Compliance API Validation",
    description: "Validate the LI Digital Product API responses against external compliance standards. Document any deviations for sign-off.",
    priority: "medium",
    status: "blocked",
    createdBy: "u-shankar",
    assignedTo: "u-zeeshan",
    dependencyFactor: "high",
    dependencyScope: "external",
    dependentOn: null,
    externalDependencyName: "LI Digital Compliance Team",
    dependencyNotes: "Blocked on receiving updated compliance checklist from LI Digital.",
    label: "Compliance",
    involvement: [
      {
        id: "i-c-1",
        userId: "u-zeeshan",
        stars: 3,
        workSummary: "Managing compliance validation process and liaising with external team.",
        updatedAt: pastHours(2),
      },
      {
        id: "i-c-2",
        userId: "u-shankar",
        stars: 2,
        workSummary: "Escalating to LI Digital for checklist delivery.",
        updatedAt: pastHours(4),
      },
    ],
    dueDate: dateOffset(6),
    internalEstimate: estimateFromDetails("medium", "compliance api validation"),
    comments: [
      {
        id: "c-c-1",
        userId: "u-zeeshan",
        body: "Sent a follow-up to LI Digital yesterday. Awaiting response.",
        createdAt: pastHours(8),
      },
    ],
    history: [
      {
        id: "h-c-1",
        actorId: "u-shankar",
        message: "Task halted pending external compliance checklist.",
        createdAt: pastHours(8),
      },
    ],
    createdAt: pastHours(24),
    updatedAt: pastHours(4),
  };

  const taskD = {
    id: "t-trainee-onboarding",
    title: "Trainee Onboarding & Dev Environment Setup",
    description: "Set up development environments, access permissions, and onboarding guides for new trainees joining the team.",
    priority: "medium",
    status: "done",
    createdBy: "u-shankar",
    assignedTo: "u-aishwarya",
    dependencyFactor: "low",
    dependencyScope: "team",
    dependentOn: "u-zeeshan",
    externalDependencyName: "",
    dependencyNotes: "Zeeshan to provide system access approvals.",
    label: "Onboarding",
    involvement: [
      {
        id: "i-d-1",
        userId: "u-aishwarya",
        stars: 4,
        workSummary: "Completed all onboarding steps and environment setup for both trainees.",
        updatedAt: pastHours(2),
      },
      {
        id: "i-d-2",
        userId: "u-ameya",
        stars: 2,
        workSummary: "Assisted with documentation and setup validation.",
        updatedAt: pastHours(3),
      },
      {
        id: "i-d-3",
        userId: "u-zeeshan",
        stars: 2,
        workSummary: "Provided access approvals and system credentials.",
        updatedAt: pastHours(4),
      },
    ],
    dueDate: dateOffset(-1),
    internalEstimate: estimateFromDetails("medium", "trainee onboarding setup"),
    comments: [
      {
        id: "c-d-1",
        userId: "u-shankar",
        body: "Great work. Both trainees are set up and ready to contribute.",
        createdAt: pastHours(2),
      },
    ],
    history: [
      {
        id: "h-d-1",
        actorId: "u-aishwarya",
        message: "Task completed. All trainees onboarded successfully.",
        createdAt: pastHours(2),
      },
    ],
    createdAt: pastHours(30),
    updatedAt: pastHours(2),
  };

  const taskE = {
    id: "t-sprint-planning",
    title: "Sprint Planning for Application Integration",
    description: "Plan the next sprint for the application integration team. Break down epics into tasks, estimate effort, and assign ownership.",
    priority: "medium",
    status: "bucket",
    createdBy: "u-shankar",
    assignedTo: null,
    dependencyFactor: "none",
    dependencyScope: "none",
    dependentOn: null,
    externalDependencyName: "",
    dependencyNotes: "",
    label: "Planning",
    involvement: [],
    dueDate: dateOffset(2),
    internalEstimate: estimateFromDetails("medium", "sprint planning application integration"),
    comments: [],
    history: [
      {
        id: "h-e-1",
        actorId: "u-shankar",
        message: "Task added to bucket for team to pick up.",
        createdAt: iso,
      },
    ],
    createdAt: iso,
    updatedAt: iso,
  };

  return {
    version: 8,
    users,
    tasks: [taskA, taskB, taskC, taskD, taskE],
    nudges: [
      {
        id: "n-1",
        taskId: "t-compliance-api",
        fromUserId: "u-shankar",
        toUserId: "u-zeeshan",
        message: "Please share the latest status on the LI Digital response before standup.",
        createdAt: pastHours(1),
        readAt: null,
      },
      {
        id: "n-2",
        taskId: "t-product-roadmap",
        fromUserId: "u-shankar",
        toUserId: "u-pawan",
        message: "Roadmap inputs are due today. Please send your section to Vegimanoj.",
        createdAt: pastHours(2),
        readAt: null,
      },
    ],
  };
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedState();
    persistLocalState(seed);
    return seed;
  }

  try {
    const parsed = JSON.parse(raw);
    // Force reseed if data is from an older schema version
    if (!parsed.version || parsed.version < 8) {
      const seed = createSeedState();
      persistLocalState(seed);
      return seed;
    }
    const normalized = sanitizeState(parsed);
    if (!normalized) {
      throw new Error("Invalid state");
    }
    return normalized;
  } catch {
    const seed = createSeedState();
    persistLocalState(seed);
    return seed;
  }
}

function sanitizeState(input) {
  if (!input || !Array.isArray(input.users) || !Array.isArray(input.tasks) || !Array.isArray(input.nudges)) {
    return null;
  }

  const users = input.users
    .filter((user) => user && typeof user.id === "string" && typeof user.username === "string")
    .map((user) => ({
      id: String(user.id),
      name: String(user.name || "Unknown User"),
      username: String(user.username || ""),
      password: String(user.password || ""),
      role: ["admin", "manager", "member"].includes(user.role) ? user.role : "member",
    }));
  const userIdSet = new Set(users.map((user) => user.id));

  const tasks = input.tasks
    .filter((task) => task && typeof task.id === "string")
    .map((task) => {
      const dependencyFactor = normalizeDependencyFactor(task.dependencyFactor);
      let dependencyScope = normalizeDependencyScope(task.dependencyScope);
      const dependentOn = task.dependentOn && userIdSet.has(String(task.dependentOn)) ? String(task.dependentOn) : null;
      const externalDependencyName = normalizeExternalDependencyName(task.externalDependencyName || "");
      const label = String(task.label || "").trim().slice(0, 28);
      const involvementByUser = new Map();
      if (Array.isArray(task.involvement)) {
        task.involvement.forEach((entry) => {
          if (!entry) return;
          const userId = String(entry.userId || "");
          if (!userIdSet.has(userId)) return;
          const stars = normalizeInvolvementStars(entry.stars);
          const workSummary = String(entry.workSummary || entry.work || "").trim().slice(0, 180);
          if (!workSummary) return;
          const updatedAt = String(entry.updatedAt || new Date().toISOString());
          const nextEntry = {
            id: typeof entry.id === "string" ? String(entry.id) : `involvement-${task.id}-${userId}`,
            userId,
            stars,
            workSummary,
            updatedAt,
          };
          const previous = involvementByUser.get(userId);
          const nextTime = Number.isFinite(new Date(updatedAt).getTime()) ? new Date(updatedAt).getTime() : 0;
          const previousTime =
            previous && Number.isFinite(new Date(previous.updatedAt).getTime()) ? new Date(previous.updatedAt).getTime() : 0;
          if (!previous || nextTime >= previousTime) {
            involvementByUser.set(userId, nextEntry);
          }
        });
      }
      const involvement = [...involvementByUser.values()];

      if (dependencyFactor !== "none" && dependencyScope === "none") {
        if (dependentOn) {
          dependencyScope = "team";
        } else if (externalDependencyName) {
          dependencyScope = "external";
        }
      }

      const resolvedDependentOn = dependencyFactor === "none" ? null : dependentOn;
      const resolvedExternalDependencyName = dependencyFactor === "none" ? "" : externalDependencyName;
      const resolvedDependencyScope = dependencyFactor === "none" ? "none" : dependencyScope;

      return {
        id: String(task.id),
        title: String(task.title || "Untitled Task"),
        description: String(task.description || ""),
        priority: PRIORITY_META[task.priority] ? task.priority : "medium",
        status: STATUS_META[task.status] ? task.status : "bucket",
        createdBy: task.createdBy ? String(task.createdBy) : "",
        assignedTo: task.assignedTo ? String(task.assignedTo) : null,
        dependencyFactor,
        dependencyScope: resolvedDependencyScope,
        dependentOn: resolvedDependentOn,
        externalDependencyName: resolvedExternalDependencyName,
        dependencyNotes: String(task.dependencyNotes || ""),
        label,
        referenceLink: normalizeAttachmentUrl(task.referenceLink || ""),
        involvement,
        dueDate: task.dueDate ? String(task.dueDate) : null,
        internalEstimate:
          task.internalEstimate && typeof task.internalEstimate === "object"
            ? {
                optimisticHours: Number(task.internalEstimate.optimisticHours || 1),
                expectedHours: Number(task.internalEstimate.expectedHours || 1),
                pessimisticHours: Number(task.internalEstimate.pessimisticHours || 1),
              }
            : estimateFromDetails(task.priority, task.description),
        comments: Array.isArray(task.comments)
          ? task.comments
              .filter((comment) => comment && typeof comment.id === "string")
              .map((comment) => ({
                id: String(comment.id),
                userId: String(comment.userId || ""),
                body: String(comment.body || ""),
                createdAt: String(comment.createdAt || new Date().toISOString()),
              }))
          : [],
        history: Array.isArray(task.history)
          ? task.history
              .filter((entry) => entry && typeof entry.id === "string")
              .map((entry) => ({
                id: String(entry.id),
                actorId: String(entry.actorId || ""),
                message: String(entry.message || ""),
                createdAt: String(entry.createdAt || new Date().toISOString()),
              }))
          : [],
        createdAt: String(task.createdAt || new Date().toISOString()),
        updatedAt: String(task.updatedAt || task.createdAt || new Date().toISOString()),
      };
    });

  const nudges = input.nudges
    .filter((nudge) => nudge && typeof nudge.id === "string")
    .map((nudge) => ({
      id: String(nudge.id),
      taskId: String(nudge.taskId || ""),
      fromUserId: String(nudge.fromUserId || ""),
      toUserId: String(nudge.toUserId || ""),
      message: String(nudge.message || ""),
      createdAt: String(nudge.createdAt || new Date().toISOString()),
      readAt: nudge.readAt ? String(nudge.readAt) : null,
    }));

  return {
    version: Number(input.version || 0),
    users,
    tasks,
    nudges,
  };
}

function cloneState(value) {
  return JSON.parse(JSON.stringify(value));
}

function persistLocalState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
}

function saveState(options = {}) {
  persistLocalState(state);
  if (options.localOnly) {
    return;
  }
  queueCloudWrite(state);
}

function queueCloudWrite(nextState) {
  if (!cloudState.enabled || !cloudState.ready || !cloudState.docRef || !cloudState.setDocFn) {
    return;
  }

  const payload = {
    ...cloneState(nextState),
    updatedAt: new Date().toISOString(),
  };

  cloudState.writeQueue = cloudState.writeQueue
    .then(() => cloudState.setDocFn(cloudState.docRef, payload))
    .catch((error) => {
      console.error("Cloud write failed", error);
      uiState.syncStatus = "error";
      uiState.syncMessage = "Cloud write failed. App remains usable with local cache.";
      render();
    });
}

async function initCloudSync() {
  if (!cloudSyncEnabled) {
    uiState.syncStatus = "local";
    uiState.syncMessage = "Cloud mode disabled in firebase-config.js. Running in local mode.";
    render();
    return;
  }

  if (!isFirebaseConfigured(firebaseConfig)) {
    uiState.syncStatus = "local";
    uiState.syncMessage = "Firebase config is incomplete. Fill firebase-config.js to enable realtime sync.";
    render();
    return;
  }

  uiState.syncStatus = "connecting";
  uiState.syncMessage = "Connecting to cloud workspace...";
  render();

  try {
    const [{ initializeApp }, firestoreModule] = await Promise.all([
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js"),
      import("https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js"),
    ]);

    const { doc, getDoc, getFirestore, onSnapshot, setDoc } = firestoreModule;
    const firebaseApp = initializeApp(firebaseConfig);
    const firestore = getFirestore(firebaseApp);

    cloudState.enabled = true;
    cloudState.docRef = doc(firestore, CLOUD_COLLECTION, CLOUD_DOCUMENT);
    cloudState.setDocFn = setDoc;

    const existing = await getDoc(cloudState.docRef);
    if (!existing.exists()) {
      await setDoc(cloudState.docRef, {
        ...cloneState(state),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const remote = sanitizeState(existing.data());
      if (remote) {
        state = remote;
        ensureSessionStillValid();
        saveState({ localOnly: true });
      }
    }

    cloudState.unsubscribe = onSnapshot(
      cloudState.docRef,
      (snapshot) => {
        if (!snapshot.exists()) return;
        const incoming = sanitizeState(snapshot.data());
        if (!incoming) return;
        state = incoming;
        ensureSessionStillValid();
        saveState({ localOnly: true });
        cloudState.ready = true;
        uiState.syncStatus = "online";
        uiState.syncMessage = "Realtime sync active across devices.";
        render();
      },
      (error) => {
        console.error("Cloud listener error", error);
        cloudState.ready = false;
        uiState.syncStatus = "error";
        uiState.syncMessage = "Cloud sync listener disconnected. Local mode remains available.";
        render();
      }
    );

    cloudState.ready = true;
    uiState.syncStatus = "online";
    uiState.syncMessage = "Realtime sync active across devices.";
    setFlash("Cloud sync connected.", "success");
    render();
  } catch (error) {
    console.error("Cloud sync initialization failed", error);
    cloudState.enabled = false;
    cloudState.ready = false;
    uiState.syncStatus = "error";
    uiState.syncMessage = "Cloud sync setup failed. Running with local data only.";
    setFlash("Cloud connection failed. Switched to local mode.", "error");
    render();
  }
}

function isFirebaseConfigured(config) {
  if (!config || typeof config !== "object") return false;
  const required = ["apiKey", "authDomain", "projectId", "appId"];
  return required.every((key) => typeof config[key] === "string" && config[key].trim().length > 0);
}

function ensureSessionStillValid() {
  const sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) return;
  const exists = state.users.some((candidate) => candidate.id === sessionId);
  if (exists) return;
  setCurrentUser("");
  uiState.selectedTaskId = null;
  uiState.loginError = "Your account no longer exists in this workspace.";
}

function getCurrentUser() {
  const userId = localStorage.getItem(SESSION_KEY);
  if (!userId) return null;
  return state.users.find((user) => user.id === userId) || null;
}

function setCurrentUser(userId) {
  if (!userId) {
    localStorage.removeItem(SESSION_KEY);
    return;
  }
  localStorage.setItem(SESSION_KEY, userId);
}

function render() {
  const user = getCurrentUser();
  if (!user) {
    appRoot.innerHTML = renderLogin();
    return;
  }

  const visibleTasks = getVisibleTasks();
  const bucketTasks = visibleTasks.filter((task) => task.status === "bucket");
  const board = {
    in_progress: visibleTasks.filter((task) => task.status === "in_progress"),
    blocked: visibleTasks.filter((task) => task.status === "blocked"),
    done: visibleTasks.filter((task) => task.status === "done"),
  };

  const unreadNudges = state.nudges.filter((nudge) => nudge.toUserId === user.id && !nudge.readAt).length;
  const myOpenTasks = state.tasks.filter(
    (task) => task.assignedTo === user.id && task.status !== "done" && task.status !== "bucket"
  ).length;
  const completedCount = visibleTasks.filter((task) => task.status === "done").length;

  appRoot.innerHTML = `
    <div class="screen">
      <header class="app-header pixel-panel animate-rise">
        <div class="header-left">
          <h1 class="header-title">Pixel Task Nexus</h1>
          <p class="header-subtitle">Shared task board with manager nudges, collaboration threads, and admin controls.</p>
        </div>
        <div class="header-right">
          ${renderSyncBadge()}
          <span class="role-chip ${escapeHtml(user.role)}">${escapeHtml(user.name)} · ${escapeHtml(user.role)}</span>
          ${uiState.syncStatus === "online" ? "" : '<button class="btn small" data-action="reset-data" type="button">Reset Demo Data</button>'}
          <button class="btn small" data-action="logout" type="button">Logout</button>
        </div>
      </header>

      ${renderFlash()}
      ${renderSyncBanner()}

      <section class="stats-grid">
        <article class="stat-card pixel-panel stat-clickable ${uiState.statFilter === "all" ? "stat-active" : ""}" data-action="stat-filter" data-filter="all" role="button" tabindex="0">
          <span class="stat-label">All Tasks</span>
          <span class="stat-value">${state.tasks.length}</span>
          ${uiState.statFilter === "all" ? '<span class="stat-hint">Showing all tasks ✕</span>' : '<span class="stat-hint">Click to filter</span>'}
        </article>
        <article class="stat-card pixel-panel stat-clickable ${uiState.statFilter === "completed" ? "stat-active" : ""}" data-action="stat-filter" data-filter="completed" role="button" tabindex="0">
          <span class="stat-label">Completed Tasks</span>
          <span class="stat-value">${state.tasks.filter((t) => t.status === "done").length}</span>
          ${uiState.statFilter === "completed" ? '<span class="stat-hint">Showing completed ✕</span>' : '<span class="stat-hint">Click to filter</span>'}
        </article>
        <article class="stat-card pixel-panel stat-clickable ${uiState.statFilter === "my_active" ? "stat-active" : ""}" data-action="stat-filter" data-filter="my_active" role="button" tabindex="0">
          <span class="stat-label">My Active</span>
          <span class="stat-value">${state.tasks.filter((t) => t.assignedTo === user.id && t.status !== "done" && t.status !== "bucket").length}</span>
          ${uiState.statFilter === "my_active" ? '<span class="stat-hint">Showing my active ✕</span>' : '<span class="stat-hint">Click to filter</span>'}
        </article>
        <article class="stat-card pixel-panel stat-clickable ${uiState.statFilter === "unread_nudges" ? "stat-active" : ""}" data-action="stat-filter" data-filter="unread_nudges" role="button" tabindex="0">
          <span class="stat-label">Unread Nudges</span>
          <span class="stat-value">${unreadNudges}</span>
          ${uiState.statFilter === "unread_nudges" ? '<span class="stat-hint">Showing nudged tasks ✕</span>' : '<span class="stat-hint">Click to filter</span>'}
        </article>
      </section>
      ${uiState.statFilter ? `<div class="stat-filter-banner">Filtering by: <strong>${getStatFilterLabel(uiState.statFilter)}</strong> — <button class="btn small ghost" data-action="stat-filter" data-filter="${uiState.statFilter}">Clear filter ✕</button></div>` : ""}

      <section class="workspace-grid">
        <main class="main-column">
          ${canManage(user) ? renderManagerPanel(user) : ""}
          ${renderBucketSection(bucketTasks, user)}
          ${renderBoard(board, user)}
        </main>

        <aside class="side-column">
          ${renderCompletedByYou(user)}
          ${renderNudgeInbox(user)}
          ${renderActivityFeed()}
          ${isAdmin(user) ? renderAdminPanel() : ""}
        </aside>
      </section>
    </div>

    ${uiState.selectedTaskId ? renderTaskModal(user) : ""}
  `;
}

function renderFlash() {
  if (!uiState.flash) return "";
  return `<div class="flash ${escapeHtml(uiState.flash.type)}">${escapeHtml(uiState.flash.message)}</div>`;
}

function renderSyncBadge() {
  let label = "Local";
  if (uiState.syncStatus === "online") label = "Cloud Live";
  else if (uiState.syncStatus === "connecting") label = "Connecting";
  else if (uiState.syncStatus === "error") label = "Sync Error";
  return `<span class="pill sync-pill ${escapeHtml(uiState.syncStatus)}">${escapeHtml(label)}</span>`;
}

function renderSyncBanner() {
  if (uiState.syncStatus === "online") return "";
  return `<div class="sync-banner ${uiState.syncStatus === "error" ? "error" : ""}">${escapeHtml(uiState.syncMessage)}</div>`;
}

function getRoleTitle(user) {
  const titles = {
    "u-rchan":     "Head B2D Tech & LI Digital Product",
    "u-shankar":   "Lead Application Dev & Integration",
    "u-zeeshan":   "Deputy Chief Manager",
    "u-aishwarya": "Trainee",
    "u-vegimanoj": "Tech Product Manager",
    "u-vaibhav":   "Technical Product Manager",
    "u-ameya":     "Trainee",
    "u-pawan":     "Product Manager",
  };
  return titles[user.id] || user.role;
}

function renderLogin() {
  const allUsers = state.users.filter((user) => ["admin", "manager", "member"].includes(user.role));

  return `
    <section class="login-layout">
      <div class="login-panel pixel-panel animate-rise">
        <div class="login-left">
          <h1 class="login-title">Pixel Task Nexus</h1>
          <p class="login-subtitle">
            Select - Sales &amp; Distribution · Application Development &amp; Integration Team
          </p>
          ${renderSyncBanner()}
          <div class="credential-grid">
            ${allUsers
              .map(
                (user) => `
                <div class="credential-row">
                  <div>
                    <strong>${escapeHtml(user.name)}</strong>
                    <div class="text-muted">${escapeHtml(getRoleTitle(user))}</div>
                    <div class="text-muted" style="font-size:0.78rem">${escapeHtml(user.username)} / ${escapeHtml(user.username)}123</div>
                  </div>
                  <button class="btn small" type="button" data-action="login-demo" data-username="${escapeHtml(user.username)}">Use</button>
                </div>
              `
              )
              .join("")}
          </div>
        </div>

        <div class="login-right">
          <h2 class="panel-title">Login</h2>
          ${uiState.loginError ? `<div class="login-error">${escapeHtml(uiState.loginError)}</div>` : ""}
          <form id="login-form" class="login-form">
            <div class="field">
              <label for="username">Username</label>
              <input id="username" name="username" autocomplete="username" required />
            </div>
            <div class="field">
              <label for="password">Password</label>
              <input id="password" name="password" type="password" autocomplete="current-password" required />
            </div>
            <button class="btn primary" type="submit">Login</button>
          </form>
        </div>
      </div>
    </section>
  `;
}

function renderManagerPanel(user) {
  const assignableTasks = sortedTasks().filter((task) => task.assignedTo && task.status !== "done");
  const dependencyOwnerOptions = state.users
    .map((candidate) => `<option value="${escapeHtml(candidate.id)}">${escapeHtml(candidate.name)}</option>`)
    .join("");

  return `
    <section class="panel pixel-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Manager Controls</h2>
          <p class="panel-subtitle">Create bucket tasks and nudge assignees when progress stalls.</p>
        </div>
      </div>

      <form id="create-task-form" class="form-grid form-centered">
        <div class="field">
          <label for="taskTitle">Task Title</label>
          <input id="taskTitle" name="title" maxlength="90" required />
        </div>
        <div class="field">
          <label for="taskPriority">Priority</label>
          <select id="taskPriority" name="priority" required>
            <option value="low">Low</option>
            <option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="field full">
          <label for="taskDescription">Description</label>
          <textarea id="taskDescription" name="description" maxlength="360" required></textarea>
        </div>
        <div class="field">
          <label for="taskDueDate">Due Date</label>
          <input id="taskDueDate" name="dueDate" type="date" />
        </div>
        <div class="field">
          <label for="taskDependencyFactor">Dependency Factor</label>
          <select id="taskDependencyFactor" name="dependencyFactor">
            <option value="none" selected>None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div class="field">
          <label for="taskDependencyScope">Dependency Source</label>
          <select id="taskDependencyScope" name="dependencyScope">
            <option value="none" selected>No dependency owner</option>
            <option value="team">Internal Team</option>
            <option value="external">External Team / Company</option>
          </select>
        </div>
        <div class="field">
          <label for="taskDependentOn">Dependent On</label>
          <select id="taskDependentOn" name="dependentOn">
            <option value="">Select team member</option>
            ${dependencyOwnerOptions}
          </select>
        </div>
        <div class="field">
          <label for="taskExternalDependency">External Team/Company</label>
          <input id="taskExternalDependency" name="externalDependencyName" maxlength="72" placeholder="Acme Integration Partner" />
        </div>
        <div class="field">
          <label for="taskLabel">Label (Optional)</label>
          <input id="taskLabel" name="label" maxlength="28" placeholder="Ops, Design, Policy" />
        </div>
        <div class="field">
          <label for="taskReferenceLink">Reference URL (Optional)</label>
          <input id="taskReferenceLink" name="referenceLink" maxlength="200" placeholder="https://docs.example.com/spec" />
        </div>
        <div class="field full">
          <label for="taskDependencyNotes">Dependency Note (Optional)</label>
          <input id="taskDependencyNotes" name="dependencyNotes" maxlength="140" placeholder="Waiting on compliance review, design handoff, or API release" />
        </div>
        <div class="field full">
          <button class="btn primary" type="submit">Add To Bucket</button>
        </div>
      </form>

      <form id="nudge-form" class="inline-form">
        <h3>Send Nudge</h3>
        <div class="split">
          <select name="taskId" required>
            <option value="">Select assigned task</option>
            ${assignableTasks
              .map(
                (task) =>
                  `<option value="${escapeHtml(task.id)}">${escapeHtml(task.title)} · ${escapeHtml(displayUserName(task.assignedTo))}</option>`
              )
              .join("")}
          </select>
          <button class="btn warn" type="submit">Nudge Assignee</button>
        </div>
        <div class="field">
          <label for="nudgeMessage">Message</label>
          <input id="nudgeMessage" name="message" maxlength="140" placeholder="Share progress before EOD and update blockers" required />
        </div>
      </form>
    </section>
  `;
}

function renderBucketSection(bucketTasks, user) {
  return `
    <section class="panel pixel-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Task Bucket</h2>
          <p class="panel-subtitle">Pending tasks managers dropped in. Team members can pick what they want to execute.</p>
        </div>
      </div>

      ${
        bucketTasks.length
          ? `<div class="bucket-grid">${bucketTasks.map((task) => renderTaskCard(task, user, "bucket")).join("")}</div>`
          : '<div class="empty-state">Bucket is clear. Manager can add new tasks using the control panel.</div>'
      }
    </section>
  `;
}

function renderBoard(board, user) {
  return `
    <section class="panel pixel-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Team Workflow Board</h2>
          <p class="panel-subtitle">Everyone can see every task and collaborate in each task thread.</p>
        </div>
      </div>

      <div class="task-columns">
        ${BOARD_STATUSES.map((status) => renderColumn(status, board[status], user)).join("")}
      </div>
    </section>
  `;
}

function renderColumn(status, tasks, user) {
  return `
    <div class="column">
      <div class="column-title">
        <span>${STATUS_META[status].label}</span>
        <span class="count-badge">${tasks.length}</span>
      </div>
      ${
        tasks.length
          ? `<div class="task-list">${tasks.map((task) => renderTaskCard(task, user, status)).join("")}</div>`
          : '<div class="empty-state">No tasks here.</div>'
      }
    </div>
  `;
}

function renderTaskCard(task, user, section) {
  const assignee = displayUserName(task.assignedTo);
  const creator = displayUserName(task.createdBy);
  const priorityMeta = PRIORITY_META[task.priority] || PRIORITY_META.medium;
  const statusMeta = STATUS_META[task.status] || STATUS_META.bucket;
  const dependencyMeta = DEPENDENCY_META[normalizeDependencyFactor(task.dependencyFactor)] || DEPENDENCY_META.none;
  const dependencyScopeMeta = DEPENDENCY_SCOPE_META[normalizeDependencyScope(task.dependencyScope)] || DEPENDENCY_SCOPE_META.none;
  const involvementSummary = getInvolvementSummary(task);
  const referenceLink = normalizeAttachmentUrl(task.referenceLink || "");

  return `
    <article class="task-card">
      <div class="task-head">
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <div class="meta-row">
          <span class="priority-pill ${priorityMeta.className}">${priorityMeta.label}</span>
          <span class="status-pill ${statusMeta.className}">${statusMeta.label}</span>
          <span class="dependency-pill ${dependencyMeta.className}">Dependency: ${dependencyMeta.label}</span>
          <span class="scope-pill ${dependencyScopeMeta.className}">${dependencyScopeMeta.label}</span>
          ${task.label ? `<span class="pill">${escapeHtml(task.label)}</span>` : ""}
        </div>
      </div>

      <p class="task-description">${escapeHtml(task.description)}</p>
      ${referenceLink ? `<a class="task-ref-link" href="${escapeHtml(referenceLink)}" target="_blank" rel="noopener noreferrer">Reference Link</a>` : ""}

      <div class="meta-row text-muted">
        <span>Assignee: ${escapeHtml(assignee)}</span>
        <span>${escapeHtml(describeDependency(task))}</span>
        <span>Due: ${escapeHtml(formatDate(task.dueDate))}</span>
        <span>By: ${escapeHtml(creator)}</span>
        <span>Involvement: ${
          involvementSummary.totalContributors
            ? `${formatInvolvementLabel(involvementSummary.averageStars)} avg (${involvementSummary.totalContributors})`
            : "Not set"
        }</span>
      </div>
      ${task.status === "blocked" ? `<div class="halt-note">${escapeHtml(describeHaltReason(task))}</div>` : ""}

      <div class="task-footer">
        <div class="task-actions">
          <button class="btn small ghost" data-action="open-task" data-task-id="${escapeHtml(task.id)}" type="button">Thread</button>
          ${renderTaskActions(task, user, section)}
        </div>
        <span class="text-muted">${task.comments.length} comments</span>
      </div>
    </article>
  `;
}

function renderTaskActions(task, user, section) {
  const isAssignee = task.assignedTo === user.id;
  const manager = canManage(user);
  const canOperate = isAssignee || manager;

  if (section === "bucket") {
    return `<button class="btn small success" data-action="pick-task" data-task-id="${escapeHtml(task.id)}" type="button">Take Task</button>`;
  }

  if (!canOperate) return "";

  if (task.status === "in_progress") {
    return `
      <button class="btn small warn" data-action="move-status" data-task-id="${escapeHtml(task.id)}" data-next-status="blocked" type="button">Halt</button>
      <button class="btn small success" data-action="move-status" data-task-id="${escapeHtml(task.id)}" data-next-status="done" type="button">Complete</button>
      ${manager ? `<button class="btn small" data-action="quick-nudge" data-task-id="${escapeHtml(task.id)}" type="button">Nudge</button>` : ""}
    `;
  }

  if (task.status === "blocked") {
    return `
      <button class="btn small" data-action="move-status" data-task-id="${escapeHtml(task.id)}" data-next-status="in_progress" type="button">Resume</button>
      <button class="btn small success" data-action="move-status" data-task-id="${escapeHtml(task.id)}" data-next-status="done" type="button">Complete</button>
      ${manager ? `<button class="btn small" data-action="quick-nudge" data-task-id="${escapeHtml(task.id)}" type="button">Nudge</button>` : ""}
    `;
  }

  if (task.status === "done") {
    return `<button class="btn small" data-action="move-status" data-task-id="${escapeHtml(task.id)}" data-next-status="in_progress" type="button">Reopen</button>`;
  }

  return "";
}

function renderCompletedByYou(user) {
  const completed = getCompletedTasksForUser(user.id);
  return `
    <section class="panel pixel-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Completed By You</h2>
          <p class="panel-subtitle">Tasks you completed and closed.</p>
        </div>
      </div>

      ${
        completed.length
          ? `<div class="inbox-list">${completed
              .slice(0, 10)
              .map(
                (task) => `
                <article class="notice">
                  <div class="notice-head">
                    <strong>${escapeHtml(task.title)}</strong>
                    <span class="text-muted">${escapeHtml(formatDate(task.updatedAt))}</span>
                  </div>
                  <div class="row-top">
                    <span class="text-muted">Assignee ${escapeHtml(displayUserName(task.assignedTo))}</span>
                    <button class="btn small ghost" data-action="open-task" data-task-id="${escapeHtml(task.id)}" type="button">Open</button>
                  </div>
                </article>
              `
              )
              .join("")}</div>`
          : '<div class="empty-state">No completed tasks yet.</div>'
      }
    </section>
  `;
}

function renderNudgeInbox(user) {
  const nudges = [...state.nudges]
    .filter((item) => item.toUserId === user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return `
    <section class="panel pixel-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Nudge Inbox</h2>
          <p class="panel-subtitle">Manager nudges targeted to you.</p>
        </div>
      </div>

      ${
        nudges.length
          ? `<div class="inbox-list">${nudges
              .map((nudge) => {
                const task = state.tasks.find((item) => item.id === nudge.taskId);
                const fromUser = displayUserName(nudge.fromUserId);
                return `
                  <article class="notice ${nudge.readAt ? "" : "unread"}">
                    <div class="notice-head">
                      <strong>${escapeHtml(task ? task.title : "Task")}</strong>
                      <span class="text-muted">${escapeHtml(timeAgo(nudge.createdAt))}</span>
                    </div>
                    <p>${escapeHtml(nudge.message)}</p>
                    <div class="row-top">
                      <span class="text-muted">From ${escapeHtml(fromUser)}</span>
                      ${
                        nudge.readAt
                          ? '<span class="pill">Read</span>'
                          : `<button class="btn small" data-action="mark-nudge-read" data-nudge-id="${escapeHtml(nudge.id)}" type="button">Mark Read</button>`
                      }
                    </div>
                  </article>
                `;
              })
              .join("")}</div>`
          : '<div class="empty-state">No nudges assigned to you.</div>'
      }
    </section>
  `;
}

function renderActivityFeed() {
  const feed = state.tasks
    .flatMap((task) =>
      (task.history || []).map((entry) => ({
        ...entry,
        taskId: task.id,
        taskTitle: task.title,
      }))
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 10);

  return `
    <section class="panel pixel-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Activity Feed</h2>
          <p class="panel-subtitle">Latest team actions across tasks.</p>
        </div>
      </div>

      ${
        feed.length
          ? `<div class="activity-list">${feed
              .map(
                (entry) => `
                <article class="activity-item">
                  <div class="row-top">
                    <strong>${escapeHtml(entry.taskTitle)}</strong>
                    <span class="text-muted">${escapeHtml(timeAgo(entry.createdAt))}</span>
                  </div>
                  <p>${escapeHtml(entry.message)}</p>
                  <div class="inline-actions">
                    <button class="btn small ghost" data-action="open-task" data-task-id="${escapeHtml(entry.taskId)}" type="button">Open Thread</button>
                  </div>
                </article>
              `
              )
              .join("")}</div>`
          : '<div class="empty-state">No activity yet.</div>'
      }
    </section>
  `;
}

function renderAdminPanel() {
  const users = [...state.users].sort((a, b) => a.name.localeCompare(b.name));

  return `
    <section class="panel pixel-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Admin Access</h2>
          <p class="panel-subtitle">Manage users and role levels.</p>
        </div>
      </div>

      <div class="user-list">
        ${users
          .map(
            (user) => `
            <article class="user-row">
              <div class="row-top">
                <strong>${escapeHtml(user.name)}</strong>
                <span class="role-chip ${escapeHtml(user.role)}">${escapeHtml(user.role)}</span>
              </div>
              <div class="text-muted">@${escapeHtml(user.username)}</div>
              <form data-form="role-update" class="split">
                <input type="hidden" name="userId" value="${escapeHtml(user.id)}" />
                <select name="role" required>
                  <option value="member" ${user.role === "member" ? "selected" : ""}>Member</option>
                  <option value="manager" ${user.role === "manager" ? "selected" : ""}>Manager</option>
                  <option value="admin" ${user.role === "admin" ? "selected" : ""}>Admin</option>
                </select>
                <button class="btn small" type="submit">Update Role</button>
              </form>
            </article>
          `
          )
          .join("")}
      </div>

      <form id="create-user-form" class="form-grid">
        <div class="field">
          <label for="newName">Name</label>
          <input id="newName" name="name" maxlength="56" required />
        </div>
        <div class="field">
          <label for="newUsername">Username</label>
          <input id="newUsername" name="username" maxlength="28" required />
        </div>
        <div class="field">
          <label for="newPassword">Password</label>
          <input id="newPassword" name="password" maxlength="28" required />
        </div>
        <div class="field">
          <label for="newRole">Role</label>
          <select id="newRole" name="role" required>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div class="field full">
          <button class="btn primary" type="submit">Create User</button>
        </div>
      </form>
    </section>
  `;
}

function renderTaskModal(user) {
  const task = state.tasks.find((item) => item.id === uiState.selectedTaskId);
  if (!task) {
    uiState.selectedTaskId = null;
    return "";
  }

  const comments = [...task.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const canAssign = canManage(user);
  const dependencyMeta = DEPENDENCY_META[normalizeDependencyFactor(task.dependencyFactor)] || DEPENDENCY_META.none;
  const dependencyScopeMeta = DEPENDENCY_SCOPE_META[normalizeDependencyScope(task.dependencyScope)] || DEPENDENCY_SCOPE_META.none;
  const dependencyLabel = describeDependency(task);
  const referenceLink = normalizeAttachmentUrl(task.referenceLink || "");
  const assigneeOptions = state.users
    .map(
      (candidate) =>
        `<option value="${escapeHtml(candidate.id)}" ${task.assignedTo === candidate.id ? "selected" : ""}>${escapeHtml(candidate.name)} (${escapeHtml(candidate.role)})</option>`
    )
    .join("");
  const dependencyOwnerOptions = state.users
    .map(
      (candidate) =>
        `<option value="${escapeHtml(candidate.id)}" ${task.dependentOn === candidate.id ? "selected" : ""}>${escapeHtml(candidate.name)}</option>`
    )
    .join("");
  const involvementEntries = getInvolvementEntries(task).sort((left, right) => {
    const starDelta = right.stars - left.stars;
    if (starDelta !== 0) return starDelta;
    return new Date(right.updatedAt) - new Date(left.updatedAt);
  });
  const myInvolvement = involvementEntries.find((entry) => entry.userId === user.id) || null;
  const involvementMarkup = involvementEntries
    .map(
      (entry) => `
      <article class="comment-row involvement-row">
        <div class="row-top">
          <strong>${escapeHtml(displayUserName(entry.userId))}</strong>
          <span class="pill involvement-pill">${escapeHtml(formatInvolvementLabel(entry.stars))}</span>
        </div>
        <p class="involvement-work">${escapeHtml(entry.workSummary)}</p>
        <span class="text-muted">Updated ${escapeHtml(timeAgo(entry.updatedAt))}</span>
      </article>
    `
    )
    .join("");

  return `
    <div class="modal-backdrop" data-action="dismiss-modal">
      <article class="modal" role="dialog" aria-modal="true" aria-label="Task details">
        <div class="row-top">
          <h3>${escapeHtml(task.title)}</h3>
          <button class="btn small" type="button" data-action="close-task-modal">Close</button>
        </div>

        <p class="task-description">${escapeHtml(task.description)}</p>
        ${referenceLink ? `<a class="task-ref-link" href="${escapeHtml(referenceLink)}" target="_blank" rel="noopener noreferrer">Task Reference</a>` : ""}

        <div class="meta-row">
          <span class="status-pill ${(STATUS_META[task.status] || STATUS_META.bucket).className}">${(STATUS_META[task.status] || STATUS_META.bucket).label}</span>
          <span class="priority-pill ${(PRIORITY_META[task.priority] || PRIORITY_META.medium).className}">${(PRIORITY_META[task.priority] || PRIORITY_META.medium).label}</span>
          <span class="dependency-pill ${dependencyMeta.className}">Dependency: ${dependencyMeta.label}</span>
          <span class="scope-pill ${dependencyScopeMeta.className}">${dependencyScopeMeta.label}</span>
          <span class="pill">Assignee: ${escapeHtml(displayUserName(task.assignedTo))}</span>
          <span class="pill">${escapeHtml(dependencyLabel)}</span>
          <span class="pill">Due: ${escapeHtml(formatDate(task.dueDate))}</span>
        </div>
        ${task.dependencyNotes ? `<p class="task-description"><strong>Dependency Note:</strong> ${escapeHtml(task.dependencyNotes)}</p>` : ""}
        ${task.status === "blocked" ? `<p class="task-description"><strong>${escapeHtml(describeHaltReason(task))}</strong></p>` : ""}

        ${
          canAssign
            ? `
            <form id="assign-form" class="inline-form form-centered">
              <input type="hidden" name="taskId" value="${escapeHtml(task.id)}" />
              <div class="split split-even">
                <select name="assigneeId">
                  <option value="">Return to bucket (unassigned)</option>
                  ${assigneeOptions}
                </select>
                <select name="dependencyFactor">
                  <option value="none" ${normalizeDependencyFactor(task.dependencyFactor) === "none" ? "selected" : ""}>None</option>
                  <option value="low" ${normalizeDependencyFactor(task.dependencyFactor) === "low" ? "selected" : ""}>Low</option>
                  <option value="medium" ${normalizeDependencyFactor(task.dependencyFactor) === "medium" ? "selected" : ""}>Medium</option>
                  <option value="high" ${normalizeDependencyFactor(task.dependencyFactor) === "high" ? "selected" : ""}>High</option>
                </select>
              </div>
              <div class="split split-even">
                <select name="dependencyScope">
                  <option value="none" ${normalizeDependencyScope(task.dependencyScope) === "none" ? "selected" : ""}>No dependency owner</option>
                  <option value="team" ${normalizeDependencyScope(task.dependencyScope) === "team" ? "selected" : ""}>Internal Team</option>
                  <option value="external" ${normalizeDependencyScope(task.dependencyScope) === "external" ? "selected" : ""}>External Team / Company</option>
                </select>
                <select name="dependentOn">
                  <option value="">Select team member</option>
                  ${dependencyOwnerOptions}
                </select>
              </div>
              <div class="split split-even">
                <input name="externalDependencyName" maxlength="72" value="${escapeHtml(task.externalDependencyName || "")}" placeholder="External team/company" />
                <input name="referenceLink" maxlength="200" value="${escapeHtml(task.referenceLink || "")}" placeholder="Reference URL (optional)" />
              </div>
              <div class="split split-even">
                <input name="dependencyNotes" maxlength="140" value="${escapeHtml(task.dependencyNotes || "")}" placeholder="Dependency note (optional)" />
                <input name="label" maxlength="28" value="${escapeHtml(task.label || "")}" placeholder="Label (optional)" />
              </div>
              <div class="inline-actions">
                <button class="btn" type="submit">Apply Task Controls</button>
              </div>
              <p class="text-muted">Managers/Admins can set dependency type as internal team or external organization.</p>
            </form>
          `
            : `
            <div class="text-muted">${escapeHtml(dependencyLabel)}</div>
            ${task.dependencyNotes ? `<div class="text-muted">Dependency Note: ${escapeHtml(task.dependencyNotes)}</div>` : ""}
          `
        }

        <section>
          <h4>Involvement Stars</h4>
          ${involvementMarkup || '<div class="empty-state">No involvement updates yet.</div>'}
          <form id="involvement-form" class="inline-form">
            <input type="hidden" name="taskId" value="${escapeHtml(task.id)}" />
            <div class="split split-even">
              <select name="stars" required>
                <option value="1" ${(myInvolvement?.stars || 3) === 1 ? "selected" : ""}>1 star · shadowing</option>
                <option value="2" ${(myInvolvement?.stars || 3) === 2 ? "selected" : ""}>2 stars · light support</option>
                <option value="3" ${(myInvolvement?.stars || 3) === 3 ? "selected" : ""}>3 stars · active contributor</option>
                <option value="4" ${(myInvolvement?.stars || 3) === 4 ? "selected" : ""}>4 stars · major owner</option>
                <option value="5" ${(myInvolvement?.stars || 3) === 5 ? "selected" : ""}>5 stars · driving execution</option>
              </select>
              <input
                name="workSummary"
                maxlength="180"
                value="${escapeHtml(myInvolvement?.workSummary || "")}"
                placeholder="What work are you doing on this task?"
                required
              />
            </div>
            <button class="btn" type="submit">${myInvolvement ? "Update" : "Set"} My Involvement</button>
            <p class="text-muted">Each teammate sets their own involvement stars and work summary.</p>
          </form>
        </section>

        <section>
          <h4>Collaboration Thread</h4>
          ${
            comments.length
              ? `<div class="comments">${comments
                  .map(
                    (comment) => `
                    <article class="comment-row">
                      <div class="row-top">
                        <strong>${escapeHtml(displayUserName(comment.userId))}</strong>
                        <span class="text-muted">${escapeHtml(timeAgo(comment.createdAt))}</span>
                      </div>
                      <p>${escapeHtml(comment.body)}</p>
                    </article>
                  `
                  )
                  .join("")}</div>`
              : '<div class="empty-state">No comments yet. Start collaborating on this task.</div>'
          }

          <form id="comment-form" class="inline-form">
            <input type="hidden" name="taskId" value="${escapeHtml(task.id)}" />
            <div class="field">
              <label for="commentBody">Add Comment</label>
              <textarea id="commentBody" name="body" maxlength="260" required></textarea>
            </div>
            <button class="btn primary" type="submit">Post Comment</button>
          </form>
        </section>
      </article>
    </div>
  `;
}

function handleClick(event) {
  const target = event.target.closest("[data-action]");
  if (!target) return;

  const action = target.dataset.action;
  const user = getCurrentUser();

  if (action === "login-demo") {
    const username = target.dataset.username;
    const account = state.users.find((item) => item.username === username);
    if (!account) return;
    const usernameInput = document.getElementById("username");
    const passwordInput = document.getElementById("password");
    if (usernameInput) usernameInput.value = account.username;
    if (passwordInput) passwordInput.value = account.username + "123";
    return;
  }

  if (action === "logout") {
    setCurrentUser("");
    uiState.selectedTaskId = null;
    uiState.loginError = "";
    uiState.flash = null;
    uiState.statFilter = null;
    render();
    return;
  }

  if (!user) return;

  if (action === "stat-filter") {
    const filter = target.dataset.filter;
    // Toggle off if same filter clicked again
    if (uiState.statFilter === filter) {
      uiState.statFilter = null;
    } else {
      uiState.statFilter = filter;
    }
    render();
    return;
  }

  if (action === "reset-data") {
    if (uiState.syncStatus === "online") {
      setFlash("Reset is disabled in cloud mode to avoid wiping shared workspace.", "error");
      render();
      return;
    }
    if (!window.confirm("Reset all local demo data for this app?")) return;
    const currentUsername = user.username;
    state = createSeedState();
    saveState();
    const mapped = state.users.find((candidate) => candidate.username === currentUsername);
    setCurrentUser(mapped ? mapped.id : "");
    uiState.selectedTaskId = null;
    uiState.statFilter = null;
    setFlash("Demo state reset.", "success");
    render();
    return;
  }

  if (action === "open-task") {
    uiState.selectedTaskId = target.dataset.taskId || null;
    render();
    return;
  }

  if (action === "close-task-modal") {
    uiState.selectedTaskId = null;
    render();
    return;
  }

  if (action === "dismiss-modal") {
    if (event.target === target) {
      uiState.selectedTaskId = null;
      render();
    }
    return;
  }

  if (action === "pick-task") {
    const taskId = target.dataset.taskId;
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || task.status !== "bucket") {
      setFlash("Task is no longer available in the bucket.", "error");
      render();
      return;
    }
    task.assignedTo = user.id;
    task.status = "in_progress";
    task.updatedAt = new Date().toISOString();
    addHistory(task, user.id, `${user.name} picked up the task from the bucket.`);
    saveState();
    setFlash("Task assigned to you.", "success");
    render();
    return;
  }

  if (action === "move-status") {
    const taskId = target.dataset.taskId;
    const nextStatus = target.dataset.nextStatus;
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || !STATUS_META[nextStatus]) return;

    const isAssignee = task.assignedTo === user.id;
    if (!canManage(user) && !isAssignee) {
      setFlash("Only assignee, manager, or admin can update this task.", "error");
      render();
      return;
    }

    task.status = nextStatus;
    if (nextStatus !== "bucket" && !task.assignedTo) task.assignedTo = user.id;
    task.updatedAt = new Date().toISOString();
    if (nextStatus === "blocked") {
      addHistory(task, user.id, `${user.name} changed status to ${STATUS_META[nextStatus].label}. ${describeHaltReason(task)}.`);
    } else {
      addHistory(task, user.id, `${user.name} changed status to ${STATUS_META[nextStatus].label}.`);
    }
    saveState();
    if (nextStatus === "blocked") {
      setFlash(`Task moved to ${STATUS_META[nextStatus].label}. ${describeHaltReason(task)}.`, "success");
    } else {
      setFlash(`Task moved to ${STATUS_META[nextStatus].label}.`, "success");
    }
    render();
    return;
  }

  if (action === "quick-nudge") {
    if (!canManage(user)) return;
    const task = state.tasks.find((item) => item.id === target.dataset.taskId);
    if (!task || !task.assignedTo) {
      setFlash("Task needs an assignee before nudging.", "error");
      render();
      return;
    }
    const message = "Please share a progress update on this task.";
    state.nudges.push({
      id: uniqueId("nudge"),
      taskId: task.id,
      fromUserId: user.id,
      toUserId: task.assignedTo,
      message,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
    addHistory(task, user.id, `${user.name} nudged ${displayUserName(task.assignedTo)} for an update.`);
    task.updatedAt = new Date().toISOString();
    saveState();
    setFlash("Nudge sent.", "success");
    render();
    return;
  }

  if (action === "mark-nudge-read") {
    const nudge = state.nudges.find((item) => item.id === target.dataset.nudgeId);
    if (!nudge || nudge.toUserId !== user.id) return;
    nudge.readAt = new Date().toISOString();
    saveState();
    render();
    return;
  }
}

async function handleSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();

  if (form.id === "login-form") {
    const formData = new FormData(form);
    const username = String(formData.get("username") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "").trim();
    const account = state.users.find((item) => item.username.toLowerCase() === username && item.password === password);
    if (!account) {
      uiState.loginError = "Invalid username or password.";
      render();
      return;
    }
    uiState.loginError = "";
    setCurrentUser(account.id);
    setFlash(`Welcome ${account.name}.`, "success");
    render();
    return;
  }

  const user = getCurrentUser();
  if (!user) return;

  if (form.id === "create-task-form") {
    if (!canManage(user)) {
      setFlash("Only manager/admin can create bucket tasks.", "error");
      render();
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const priority = String(formData.get("priority") || "medium");
    const dueDate = String(formData.get("dueDate") || "").trim();
    const dependencyInput = buildDependencyData({
      factorInput: String(formData.get("dependencyFactor") || "none"),
      scopeInput: String(formData.get("dependencyScope") || "none"),
      dependentOnInput: String(formData.get("dependentOn") || "").trim() || null,
      externalDependencyNameInput: String(formData.get("externalDependencyName") || ""),
      notesInput: String(formData.get("dependencyNotes") || ""),
    });
    const label = String(formData.get("label") || "").trim().slice(0, 28);
    const referenceLink = normalizeAttachmentUrl(String(formData.get("referenceLink") || ""));

    if (!title || !description) {
      setFlash("Title and description are required.", "error");
      render();
      return;
    }

    if (!dependencyInput.ok) {
      setFlash(dependencyInput.error, "error");
      render();
      return;
    }

    const now = new Date().toISOString();
    const task = {
      id: uniqueId("task"),
      title,
      description,
      priority: PRIORITY_META[priority] ? priority : "medium",
      status: "bucket",
      createdBy: user.id,
      assignedTo: null,
      ...dependencyInput.value,
      label,
      referenceLink,
      involvement: [],
      dueDate: dueDate || null,
      internalEstimate: estimateFromDetails(priority, description),
      comments: [],
      history: [],
      createdAt: now,
      updatedAt: now,
    };

    const dependencyContext = describeDependency(task);
    addHistory(task, user.id, `${user.name} created the task in the pending bucket. ${dependencyContext}`);
    state.tasks.push(task);
    saveState();
    form.reset();
    setFlash("Task added to bucket.", "success");
    render();
    return;
  }

  if (form.id === "nudge-form") {
    if (!canManage(user)) return;

    const formData = new FormData(form);
    const taskId = String(formData.get("taskId") || "");
    const message = String(formData.get("message") || "").trim();
    const task = state.tasks.find((item) => item.id === taskId);

    if (!task || !task.assignedTo) {
      setFlash("Select an assigned task before nudging.", "error");
      render();
      return;
    }

    if (!message) {
      setFlash("Nudge message cannot be empty.", "error");
      render();
      return;
    }

    state.nudges.push({
      id: uniqueId("nudge"),
      taskId: task.id,
      fromUserId: user.id,
      toUserId: task.assignedTo,
      message,
      createdAt: new Date().toISOString(),
      readAt: null,
    });
    addHistory(task, user.id, `${user.name} nudged ${displayUserName(task.assignedTo)}.`);
    task.updatedAt = new Date().toISOString();
    saveState();
    form.reset();
    setFlash("Nudge sent to assignee.", "success");
    render();
    return;
  }

  if (form.id === "comment-form") {
    const formData = new FormData(form);
    const taskId = String(formData.get("taskId") || "");
    const body = String(formData.get("body") || "").trim();
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task || !body) return;

    task.comments.push({
      id: uniqueId("comment"),
      userId: user.id,
      body,
      createdAt: new Date().toISOString(),
    });
    task.updatedAt = new Date().toISOString();
    addHistory(task, user.id, `${user.name} added a comment.`);
    saveState();
    form.reset();
    setFlash("Comment posted.", "success");
    render();
    return;
  }

  if (form.id === "assign-form") {
    if (!canManage(user)) return;

    const formData = new FormData(form);
    const taskId = String(formData.get("taskId") || "");
    const assigneeId = String(formData.get("assigneeId") || "").trim();
    const dependencyInput = buildDependencyData({
      factorInput: String(formData.get("dependencyFactor") || "none"),
      scopeInput: String(formData.get("dependencyScope") || "none"),
      dependentOnInput: String(formData.get("dependentOn") || "").trim() || null,
      externalDependencyNameInput: String(formData.get("externalDependencyName") || ""),
      notesInput: String(formData.get("dependencyNotes") || ""),
    });
    const label = String(formData.get("label") || "").trim().slice(0, 28);
    const referenceLink = normalizeAttachmentUrl(String(formData.get("referenceLink") || ""));
    const task = state.tasks.find((item) => item.id === taskId);

    if (!task) return;

    if (!dependencyInput.ok) {
      setFlash(dependencyInput.error, "error");
      render();
      return;
    }

    const previousAssignee = task.assignedTo || null;
    const previousDependencyFactor = normalizeDependencyFactor(task.dependencyFactor);
    const previousDependencyScope = normalizeDependencyScope(task.dependencyScope);
    const previousDependentOn = task.dependentOn || null;
    const previousExternalDependencyName = String(task.externalDependencyName || "");
    const previousDependencyNotes = String(task.dependencyNotes || "");
    const previousLabel = String(task.label || "");
    const previousReferenceLink = normalizeAttachmentUrl(task.referenceLink || "");

    task.assignedTo = assigneeId || null;
    task.status = task.assignedTo ? (task.status === "done" ? "done" : "in_progress") : "bucket";
    task.dependencyFactor = dependencyInput.value.dependencyFactor;
    task.dependencyScope = dependencyInput.value.dependencyScope;
    task.dependentOn = dependencyInput.value.dependentOn;
    task.externalDependencyName = dependencyInput.value.externalDependencyName;
    task.dependencyNotes = dependencyInput.value.dependencyNotes;
    task.label = label;
    task.referenceLink = referenceLink;
    task.updatedAt = new Date().toISOString();

    const assigneeChanged = previousAssignee !== task.assignedTo;
    const dependencyChanged =
      previousDependencyFactor !== task.dependencyFactor ||
      previousDependencyScope !== task.dependencyScope ||
      previousDependentOn !== task.dependentOn ||
      previousExternalDependencyName !== task.externalDependencyName ||
      previousDependencyNotes !== task.dependencyNotes ||
      previousLabel !== task.label ||
      previousReferenceLink !== task.referenceLink;

    if (assigneeChanged && task.assignedTo) {
      addHistory(task, user.id, `${user.name} assigned this task to ${displayUserName(task.assignedTo)}.`);
    } else if (assigneeChanged) {
      addHistory(task, user.id, `${user.name} returned this task to the pending bucket.`);
    }

    if (dependencyChanged) {
      addHistory(task, user.id, `${user.name} updated dependency controls. ${describeDependency(task)}.`);
    }

    if (assigneeChanged || dependencyChanged) {
      setFlash("Task controls updated.", "success");
    } else {
      setFlash("No changes detected in task controls.", "success");
    }

    saveState();
    render();
    return;
  }

  if (form.id === "involvement-form") {
    const formData = new FormData(form);
    const taskId = String(formData.get("taskId") || "");
    const stars = normalizeInvolvementStars(formData.get("stars"));
    const workSummary = String(formData.get("workSummary") || "").trim().slice(0, 180);
    const task = state.tasks.find((item) => item.id === taskId);
    if (!task) return;
    if (!workSummary) {
      setFlash("Add a short work summary with your involvement stars.", "error");
      render();
      return;
    }

    task.involvement = Array.isArray(task.involvement) ? task.involvement : [];
    const existing = task.involvement.find((entry) => entry && entry.userId === user.id);
    const now = new Date().toISOString();

    if (existing) {
      existing.stars = stars;
      existing.workSummary = workSummary;
      existing.updatedAt = now;
    } else {
      task.involvement.push({
        id: uniqueId("involvement"),
        userId: user.id,
        stars,
        workSummary,
        updatedAt: now,
      });
    }

    task.updatedAt = now;
    addHistory(task, user.id, `${user.name} set involvement to ${formatInvolvementLabel(stars)}.`);
    saveState();
    setFlash("Involvement updated.", "success");
    render();
    return;
  }

  if (form.dataset.form === "role-update") {
    if (!isAdmin(user)) return;

    const formData = new FormData(form);
    const userId = String(formData.get("userId") || "");
    const role = String(formData.get("role") || "member");
    const target = state.users.find((item) => item.id === userId);

    if (!target || !["member", "manager", "admin"].includes(role)) return;

    if (target.role === "admin" && role !== "admin") {
      const adminCount = state.users.filter((member) => member.role === "admin").length;
      if (adminCount <= 1) {
        setFlash("At least one admin account must remain.", "error");
        render();
        return;
      }
    }

    target.role = role;
    saveState();
    setFlash(`Role updated for ${target.name}.`, "success");
    render();
    return;
  }

  if (form.id === "create-user-form") {
    if (!isAdmin(user)) return;

    const formData = new FormData(form);
    const name = String(formData.get("name") || "").trim();
    const username = String(formData.get("username") || "").trim().toLowerCase();
    const password = String(formData.get("password") || "").trim();
    const role = String(formData.get("role") || "member");

    if (!name || !username || !password) {
      setFlash("All user fields are required.", "error");
      render();
      return;
    }

    if (state.users.some((item) => item.username.toLowerCase() === username)) {
      setFlash("Username already exists.", "error");
      render();
      return;
    }

    state.users.push({
      id: uniqueId("user"),
      name,
      username,
      password,
      role: ["member", "manager", "admin"].includes(role) ? role : "member",
    });

    saveState();
    form.reset();
    setFlash("User created.", "success");
    render();
    return;
  }
}

function addHistory(task, actorId, message) {
  if (!Array.isArray(task.history)) task.history = [];
  task.history.push({
    id: uniqueId("history"),
    actorId,
    message,
    createdAt: new Date().toISOString(),
  });
}

function sortedTasks() {
  return [...state.tasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function getVisibleTasks() {
  const currentUser = getCurrentUser();
  let tasks = sortedTasks();

  if (uiState.statFilter === "all") {
    // show all, no extra filter
  } else if (uiState.statFilter === "completed") {
    tasks = tasks.filter((t) => t.status === "done");
  } else if (uiState.statFilter === "my_active") {
    tasks = tasks.filter((t) => currentUser && t.assignedTo === currentUser.id && t.status !== "done" && t.status !== "bucket");
  } else if (uiState.statFilter === "unread_nudges") {
    const nudgedTaskIds = new Set(
      state.nudges
        .filter((n) => currentUser && n.toUserId === currentUser.id && !n.readAt)
        .map((n) => n.taskId)
    );
    tasks = tasks.filter((t) => nudgedTaskIds.has(t.id));
  }

  return tasks;
}

function getStatFilterLabel(filter) {
  if (filter === "all") return "All Tasks";
  if (filter === "completed") return "Completed Tasks";
  if (filter === "my_active") return "My Active Tasks";
  if (filter === "unread_nudges") return "Tasks with Unread Nudges";
  return "";
}

function getInvolvementEntries(task) {
  if (!Array.isArray(task.involvement)) return [];

  const byUser = new Map();
  task.involvement.forEach((entry) => {
    if (!entry || typeof entry.userId !== "string") return;
    const normalized = {
      id: String(entry.id || `involvement-${entry.userId}`),
      userId: String(entry.userId),
      stars: normalizeInvolvementStars(entry.stars),
      workSummary: String(entry.workSummary || "").trim().slice(0, 180),
      updatedAt: String(entry.updatedAt || new Date().toISOString()),
    };
    if (!normalized.workSummary) return;
    const existing = byUser.get(normalized.userId);
    const nextTime = Number.isFinite(new Date(normalized.updatedAt).getTime()) ? new Date(normalized.updatedAt).getTime() : 0;
    const existingTime =
      existing && Number.isFinite(new Date(existing.updatedAt).getTime()) ? new Date(existing.updatedAt).getTime() : 0;
    if (!existing || nextTime >= existingTime) {
      byUser.set(normalized.userId, normalized);
    }
  });

  return [...byUser.values()];
}

function getInvolvementSummary(task) {
  const entries = getInvolvementEntries(task);
  if (!entries.length) return { totalContributors: 0, totalStars: 0, averageStars: 0 };
  const totalStars = entries.reduce((sum, entry) => sum + entry.stars, 0);
  return {
    totalContributors: entries.length,
    totalStars,
    averageStars: Math.round((totalStars / entries.length) * 10) / 10,
  };
}

function formatInvolvementLabel(stars) {
  const value = Number(stars);
  if (!Number.isFinite(value)) return "0 stars";
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} star${rounded === 1 ? "" : "s"}`;
}

function getCompletedTasksForUser(userId) {
  return sortedTasks().filter((task) => didUserCompleteTask(task, userId));
}

function didUserCompleteTask(task, userId) {
  if (!task || task.status !== "done") return false;
  if (task.assignedTo === userId) return true;
  if (!Array.isArray(task.history)) return false;
  return task.history.some((entry) => {
    if (!entry || entry.actorId !== userId || typeof entry.message !== "string") return false;
    return entry.message.toLowerCase().includes("changed status to done");
  });
}

function displayUserName(userId) {
  if (!userId) return "Unassigned";
  const user = state.users.find((member) => member.id === userId);
  return user ? user.name : "Unknown";
}

function normalizeDependencyFactor(value) {
  return DEPENDENCY_META[value] ? value : "none";
}

function normalizeDependencyScope(value) {
  return DEPENDENCY_SCOPE_META[value] ? value : "none";
}

function normalizeDependencyOwner(userId) {
  if (!userId) return null;
  return state.users.some((member) => member.id === userId) ? userId : null;
}

function normalizeInvolvementStars(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 3;
  return Math.min(5, Math.max(1, Math.round(number)));
}

function normalizeAttachmentUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  try {
    const url = new URL(text);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeExternalDependencyName(value) {
  return String(value || "").trim().slice(0, 72);
}

function buildDependencyData({ factorInput, scopeInput, dependentOnInput, externalDependencyNameInput, notesInput }) {
  const dependencyFactor = normalizeDependencyFactor(factorInput);
  let dependencyScope = normalizeDependencyScope(scopeInput);
  let dependentOn = normalizeDependencyOwner(dependentOnInput);
  let externalDependencyName = normalizeExternalDependencyName(externalDependencyNameInput);
  const dependencyNotes = String(notesInput || "").trim();

  if (dependencyFactor === "none") {
    return {
      ok: true,
      value: { dependencyFactor: "none", dependencyScope: "none", dependentOn: null, externalDependencyName: "", dependencyNotes },
    };
  }

  if (dependencyScope === "none") {
    dependencyScope = dependentOn ? "team" : externalDependencyName ? "external" : "team";
  }

  if (dependencyScope === "team") {
    if (!dependentOn) return { ok: false, error: "Choose a team member for internal dependency." };
    externalDependencyName = "";
  } else if (dependencyScope === "external") {
    dependentOn = null;
    if (!externalDependencyName) return { ok: false, error: "Enter external team/company for external dependency." };
  }

  return { ok: true, value: { dependencyFactor, dependencyScope, dependentOn, externalDependencyName, dependencyNotes } };
}

function describeDependency(task) {
  const dependencyFactor = normalizeDependencyFactor(task.dependencyFactor);
  const dependencyScope = normalizeDependencyScope(task.dependencyScope);
  if (dependencyFactor === "none" || dependencyScope === "none") return "No active dependency";
  if (dependencyScope === "team") return `Internal: ${displayUserName(task.dependentOn)}`;
  if (dependencyScope === "external") return `External: ${task.externalDependencyName || "External team/company"}`;
  return "No active dependency";
}

function describeHaltDependencyTarget(task) {
  const dependencyScope = normalizeDependencyScope(task.dependencyScope);
  if (dependencyScope === "team") return `Internal Team (${displayUserName(task.dependentOn)})`;
  if (dependencyScope === "external") return `External Team/Company (${task.externalDependencyName || "Not specified"})`;
  return "Unspecified Team/Company";
}

function describeHaltReason(task) {
  return `Halted because of dependency on ${describeHaltDependencyTarget(task)}`;
}

function canManage(user) {
  return user.role === "manager" || user.role === "admin";
}

function isAdmin(user) {
  return user.role === "admin";
}

function uniqueId(prefix) {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now()}`;
}

function setFlash(message, type) {
  uiState.flash = { message, type, token: Date.now() };
  const token = uiState.flash.token;
  if (flashTimerId) clearTimeout(flashTimerId);
  flashTimerId = window.setTimeout(() => {
    if (uiState.flash && uiState.flash.token === token) {
      uiState.flash = null;
      render();
    }
  }, FLASH_TIMEOUT_MS);
}

function estimateFromDetails(priority, details) {
  const safePriority = PRIORITY_META[priority] ? priority : "medium";
  const baseByPriority = { low: 3, medium: 6, high: 10 };
  const complexityBonus = Math.min(6, Math.floor(String(details || "").length / 70));
  const expected = baseByPriority[safePriority] + complexityBonus;
  return {
    optimisticHours: Math.max(1, expected - 2),
    expectedHours: expected,
    pessimisticHours: expected + Math.max(3, Math.ceil(expected * 0.45)),
  };
}

function dateOffset(days) {
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

function pastHours(hours) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function timeAgo(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "just now";
  const elapsedSeconds = Math.round((date.getTime() - Date.now()) / 1000);
  if (Math.abs(elapsedSeconds) < 60) return "just now";

  const intervals = [
    [60, "second"],
    [3600, "minute"],
    [86400, "hour"],
    [604800, "day"],
    [2629800, "week"],
    [31557600, "month"],
    [Infinity, "year"],
  ];

  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (let index = 1; index < intervals.length; index += 1) {
    const [threshold, unit] = intervals[index];
    if (Math.abs(elapsedSeconds) < threshold) {
      const [baseSeconds] = intervals[index - 1];
      const value = Math.round(elapsedSeconds / baseSeconds);
      return formatter.format(value, unit);
    }
  }
  return "just now";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
