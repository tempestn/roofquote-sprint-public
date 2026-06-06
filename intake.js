const DEFAULT_PRICE = 109;
const DEFAULT_PAYMENT =
  "mailto:?subject=RoofQuote%20Sprint%20setup&body=I%20want%20the%20%24109%20instant%20roof%20quote%20setup.";
const DRAFT_KEY = "roofquote-intake-draft";
const CONFIG = window.ROOFQUOTE_CONFIG || {};

const params = new URLSearchParams(window.location.search);
const demoParams = [
  "company",
  "city",
  "phone",
  "checkout",
  "booking",
  "area",
  "material",
  "margin",
  "deposit",
  "stories",
  "pitch",
  "complexity",
  "tearOff",
  "timeline",
  "unitArchitectural",
  "unitThreeTab",
  "unitMetal",
  "unitTile",
  "cta",
  "instant",
  "source",
  "contact",
];
const form = document.querySelector("#intakeForm");
const companyInput = document.querySelector("#companyInput");
const serviceAreaInput = document.querySelector("#serviceAreaInput");
const phoneInput = document.querySelector("#phoneInput");
const paymentLinks = [document.querySelector("#paymentLink"), document.querySelector("#paymentLinkInline")].filter(Boolean);
const demoLink = document.querySelector("#demoLink");
const contextLine = document.querySelector("#contextLine");
const priceLabel = document.querySelector("#priceLabel");
const priceField = document.querySelector("#priceField");
const handoffText = document.querySelector("#handoffText");
const copyHandoffButton = document.querySelector("#copyHandoffButton");
const toast = document.querySelector("#toast");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

function money(value) {
  return `$${Number(value || DEFAULT_PRICE).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function configValue(key) {
  return String(CONFIG[key] || "").trim();
}

function applyParams() {
  const company = params.get("company")?.trim();
  const city = params.get("city")?.trim();
  const phone = params.get("phone")?.trim();
  const checkout = params.get("checkout")?.trim();
  const price = Number(params.get("price") || DEFAULT_PRICE);

  if (company) companyInput.value = company;
  if (city) serviceAreaInput.value = city;
  if (phone) phoneInput.value = phone;
  if (company || city) {
    contextLine.textContent = `Setup intake for ${company || "a roofing team"}${city ? ` in ${city}` : ""}.`;
    document.title = `${company || city} RoofQuote Setup Intake`;
  }

  priceLabel.textContent = money(price);
  priceField.value = String(price || DEFAULT_PRICE);

  const paymentHref = checkout || configValue("checkoutUrl") || DEFAULT_PAYMENT;
  paymentLinks.forEach((link) => {
    link.href = paymentHref;
    link.textContent = `Pay ${money(price)}`;
  });

  const demoQuery = new URLSearchParams();
  demoParams.forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) demoQuery.set(key, value);
  });
  if (!demoQuery.get("checkout") && configValue("checkoutUrl")) demoQuery.set("checkout", configValue("checkoutUrl"));
  if (!demoQuery.get("booking") && configValue("bookingUrl")) demoQuery.set("booking", configValue("bookingUrl"));
  demoLink.href = `./index.html${demoQuery.toString() ? `?${demoQuery}` : ""}#estimator`;

  handoffText.textContent = `Thanks. Please submit logo, service area, phone/email, material options, recent quote range, deposit percent, and booking link here: ${window.location.href}`;
}

function readDraft() {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY)) || {};
  } catch {
    return {};
  }
}

function saveDraft() {
  const data = new FormData(form);
  const values = {};
  data.forEach((value, key) => {
    if (value instanceof File) return;
    values[key] = value;
  });
  localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
}

function hydrateDraft() {
  const draft = readDraft();
  Object.entries(draft).forEach(([key, value]) => {
    const field = form.elements[key];
    if (!field || field.type === "hidden" || field.type === "file") return;
    field.value = value;
  });
}

async function copyHandoff() {
  try {
    await navigator.clipboard.writeText(handoffText.textContent);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = handoffText.textContent;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  showToast("Handoff text copied");
}

hydrateDraft();
applyParams();

form.addEventListener("input", saveDraft);
form.addEventListener("change", saveDraft);
form.addEventListener("submit", () => localStorage.removeItem(DRAFT_KEY));
copyHandoffButton.addEventListener("click", copyHandoff);
