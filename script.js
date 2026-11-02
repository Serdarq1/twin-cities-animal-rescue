/* Twin Cities Animal Rescue - interactivity (loaded on services.html and contact.html).
   1. Volunteer role finder (services.html): filter roles by availability
      and save favorites to "My volunteer list".
   2. Contact page (contact.html): show the saved list and pre-fill the form.
   3. Form validation (contact.html): clear messages next to each field. */

/* ---------- Data ---------- */

// Every volunteer role the rescue offers, and when each one happens.
const volunteerRoles = [
  {
    id: "dog-walker",
    title: "Dog Walker",
    description: "Walk and exercise dogs at our center. Shifts are two hours.",
    times: ["weekday-mornings", "weekday-evenings"]
  },
  {
    id: "cat-socializer",
    title: "Cat Socializer",
    description: "Spend quiet time with shy cats so they are ready to meet adopters.",
    times: ["weekday-evenings", "weekends"]
  },
  {
    id: "event-helper",
    title: "Adoption Event Helper",
    description: "Greet visitors and handle animals at weekend adoption events around the Twin Cities.",
    times: ["weekends"]
  },
  {
    id: "transport-driver",
    title: "Transport Driver",
    description: "Drive animals to vet appointments and foster homes using your own vehicle.",
    times: ["weekday-mornings", "weekends"]
  }
];

// Same values as the "When are you usually available?" menu on the contact form.
const availabilityLabels = {
  "weekday-mornings": "Weekday mornings",
  "weekday-evenings": "Weekday evenings",
  "weekends": "Weekends",
  "flexible": "Flexible"
};

const storageKeys = {
  roles: "tcar-volunteer-roles",
  availability: "tcar-availability"
};

/* ---------- Browser storage ---------- */

// localStorage can be blocked (private mode, strict settings), so never let it crash the page.
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    // Storage unavailable: the feature still works for this visit.
  }
}

function getSavedRoleIds() {
  const ids = readStorage(storageKeys.roles, []);
  // Ignore anything that is not a real role id.
  return Array.isArray(ids) ? ids.filter((id) => findRole(id)) : [];
}

function findRole(id) {
  return volunteerRoles.find((role) => role.id === id);
}

/* ---------- 1. Volunteer role finder (services.html) ---------- */

function getMatchingRoles(availability) {
  if (availability === "all" || availability === "flexible") {
    return volunteerRoles;
  }
  return volunteerRoles.filter((role) => role.times.includes(availability));
}

function createRoleCard(role, isSaved) {
  const item = document.createElement("li");

  const title = document.createElement("h3");
  title.textContent = role.title;

  const description = document.createElement("p");
  description.textContent = role.description;

  const times = document.createElement("p");
  times.className = "role-times";
  times.textContent = "When: " + role.times.map((time) => availabilityLabels[time]).join(", ");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "save-role";
  button.dataset.roleId = role.id;
  button.setAttribute("aria-pressed", String(isSaved));
  button.textContent = isSaved ? "✓ On my list" : "Add to my list";

  item.append(title, description, times, button);
  return item;
}

function renderRoles() {
  const availability = document.getElementById("role-filter").value;
  const savedIds = getSavedRoleIds();
  const matches = getMatchingRoles(availability);
  const list = document.getElementById("role-list");

  list.replaceChildren(...matches.map((role) => createRoleCard(role, savedIds.includes(role.id))));
  document.getElementById("role-count").textContent =
    "Showing " + matches.length + " of " + volunteerRoles.length + " roles.";
}

function renderShortlist() {
  const savedRoles = getSavedRoleIds().map(findRole);
  const list = document.getElementById("shortlist");

  list.replaceChildren(...savedRoles.map((role) => {
    const item = document.createElement("li");
    item.textContent = role.title;
    return item;
  }));
  document.getElementById("shortlist-empty").hidden = savedRoles.length > 0;
  document.getElementById("shortlist-next").hidden = savedRoles.length === 0;
}

function toggleRole(id) {
  const savedIds = getSavedRoleIds();
  const updated = savedIds.includes(id)
    ? savedIds.filter((savedId) => savedId !== id)
    : [...savedIds, id];
  writeStorage(storageKeys.roles, updated);
}

function initRoleFinder() {
  const finder = document.getElementById("role-finder");
  if (!finder) return;

  // Swap the plain list (shown without JavaScript) for the interactive finder.
  document.getElementById("role-static").hidden = true;
  finder.hidden = false;

  const filter = document.getElementById("role-filter");
  const savedAvailability = readStorage(storageKeys.availability, "all");
  if (filter.querySelector(`option[value="${savedAvailability}"]`)) {
    filter.value = savedAvailability;
  }

  filter.addEventListener("change", () => {
    writeStorage(storageKeys.availability, filter.value);
    renderRoles();
  });

  // One listener for every card button, including cards re-rendered later.
  document.getElementById("role-list").addEventListener("click", (event) => {
    const button = event.target.closest(".save-role");
    if (!button) return;
    toggleRole(button.dataset.roleId);
    renderRoles();
    renderShortlist();
    document.querySelector(`.save-role[data-role-id="${button.dataset.roleId}"]`)?.focus();
  });

  renderRoles();
  renderShortlist();
}

/* ---------- 2. Pre-fill the contact form (contact.html) ---------- */

function initContactPrefill() {
  const notice = document.getElementById("saved-roles");
  if (!notice) return;

  const savedRoles = getSavedRoleIds().map(findRole);
  const availability = readStorage(storageKeys.availability, "all");

  if (availabilityLabels[availability]) {
    document.getElementById("availability").value = availability;
  }

  if (savedRoles.length === 0) return;

  const titles = savedRoles.map((role) => role.title);
  document.getElementById("saved-roles-list").textContent = titles.join(", ");
  document.getElementById("roles").value = titles.join(", ");
  document.getElementById("interest-volunteer").checked = true;
  notice.hidden = false;
}

/* ---------- 3. Form validation (contact.html) ---------- */

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^\d{3}-\d{3}-\d{4}$/;

// Each rule returns an error message, or "" when the value is fine.
const validationRules = {
  name: (value) => {
    if (value === "") return "Please enter your full name.";
    if (value.length < 2) return "Your name must be at least 2 characters.";
    return "";
  },
  email: (value) => {
    if (value === "") return "Please enter your email address.";
    if (!emailPattern.test(value)) return "Enter an email like name@example.com.";
    return "";
  },
  phone: (value) => {
    if (value !== "" && !phonePattern.test(value)) return "Use the format 612-555-0147, or leave this blank.";
    return "";
  },
  interest: () => {
    if (!document.querySelector('input[name="interest"]:checked')) return "Please choose what you are interested in.";
    return "";
  },
  availability: (value) => (value === "" ? "Please choose when you are usually available." : ""),
  "start-date": (value) => {
    const today = new Date().toISOString().slice(0, 10);
    if (value !== "" && value < today) return "Choose today or a future date.";
    return "";
  },
  experience: (value) => (value === "" ? "Please tell us about your experience with pets." : ""),
  message: (value) => {
    if (value === "") return "Please write a short message.";
    if (value.length < 10) return `Your message needs at least 10 characters (you have ${value.length}).`;
    if (value.length > 500) return "Please keep your message under 500 characters.";
    return "";
  }
};

function getErrorElement(fieldId) {
  return document.getElementById(fieldId + "-error");
}

function showFieldError(fieldId, message) {
  const error = getErrorElement(fieldId);
  const field = fieldId === "interest"
    ? document.getElementById("interest-group")
    : document.getElementById(fieldId);

  error.textContent = message;
  error.hidden = message === "";
  field.setAttribute("aria-invalid", String(message !== ""));
}

function validateField(fieldId) {
  const field = document.getElementById(fieldId);
  const value = field ? field.value.trim() : "";
  const message = validationRules[fieldId](value);
  showFieldError(fieldId, message);
  return message === "";
}

function validateForm() {
  const invalidIds = Object.keys(validationRules).filter((fieldId) => !validateField(fieldId));
  return invalidIds;
}

function focusField(fieldId) {
  const target = fieldId === "interest"
    ? document.querySelector('input[name="interest"]')
    : document.getElementById(fieldId);
  target.focus();
}

function initFormValidation() {
  const form = document.getElementById("interest-form");
  if (!form) return;

  // Turn off the browser's own pop-ups so our messages show next to each field.
  form.noValidate = true;
  const status = document.getElementById("form-status");

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const invalidIds = validateForm();

    if (invalidIds.length > 0) {
      status.hidden = true;
      focusField(invalidIds[0]);
      return;
    }

    const name = document.getElementById("name").value.trim();
    status.textContent = `Thank you, ${name}! A coordinator will reply within two business days.`;
    status.hidden = false;
    form.reset();
    initContactPrefill();
  });

  // Once a field has shown an error, re-check it as the user fixes it.
  form.addEventListener("input", (event) => recheckField(event.target));
  form.addEventListener("change", (event) => recheckField(event.target));
}

function recheckField(target) {
  const fieldId = target.name === "interest" ? "interest" : target.id;
  const error = getErrorElement(fieldId);
  if (validationRules[fieldId] && error && !error.hidden) {
    validateField(fieldId);
  }
}

/* ---------- Start ---------- */

initRoleFinder();
initContactPrefill();
initFormValidation();
