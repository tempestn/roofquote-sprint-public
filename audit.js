const DEFAULT_CHECKOUT =
  "mailto:?subject=RoofQuote%20Sprint%20setup&body=I%20want%20the%20%24109%20instant%20roof%20quote%20setup.";
const CONFIG = window.ROOFQUOTE_CONFIG || {};

const params = new URLSearchParams(window.location.search);
const passthroughParams = [
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

const els = {
  brandMark: document.querySelector("#brandMark"),
  brandName: document.querySelector("#brandName"),
  headline: document.querySelector("#headline"),
  summaryText: document.querySelector("#summaryText"),
  ctaSeen: document.querySelector("#ctaSeen"),
  fitLabel: document.querySelector("#fitLabel"),
  ctaRecommendation: document.querySelector("#ctaRecommendation"),
  salesLink: document.querySelector("#salesLink"),
  demoLink: document.querySelector("#demoLink"),
  quotePageLink: document.querySelector("#quotePageLink"),
  flyerLink: document.querySelector("#flyerLink"),
  checkoutLink: document.querySelector("#checkoutLink"),
  copyAuditButton: document.querySelector("#copyAuditButton"),
  toast: document.querySelector("#toast"),
};

function initials(name) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "RQ"
  );
}

function demoQuery() {
  const query = new URLSearchParams();
  passthroughParams.forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) query.set(key, value);
  });
  if (!query.get("checkout") && configValue("checkoutUrl")) query.set("checkout", configValue("checkoutUrl"));
  if (!query.get("booking") && configValue("bookingUrl")) query.set("booking", configValue("bookingUrl"));
  return query.toString();
}

function configValue(key) {
  return String(CONFIG[key] || "").trim();
}

function linkFor(path, hash = "") {
  const query = demoQuery();
  return `.${path}${query ? `?${query}` : ""}${hash}`;
}

function auditSummary(company, city, cta, salesUrl, demoUrl, flyerUrl) {
  return `Quick estimate-flow audit for ${company}

Current CTA I noticed: ${cta}

Suggestion:
1. Send estimate visitors to an instant quote page before a generic request form.
2. Capture roof area, material, pitch, timeline, and contact info so callback starts warmer.
3. Reuse the same link as a QR flyer for door hangers, ads, business cards, or referral partners in ${city}.

Mocked-up setup offer: ${salesUrl}
Quote page: ${demoUrl}
QR flyer preview: ${flyerUrl}`;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2200);
}

async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  showToast(message);
}

function applyAudit() {
  const company = params.get("company")?.trim() || "RoofQuote Sprint";
  const city = params.get("city")?.trim() || "your service area";
  const cta = params.get("cta")?.trim() || "Free estimate";
  const checkout = params.get("checkout")?.trim();
  const instant = params.get("instant")?.trim();
  const mark = initials(company);
  const salesUrl = linkFor("/sales.html");
  const demoUrl = linkFor("/index.html", "#estimator");
  const flyerUrl = linkFor("/marketing.html");

  document.title = `${company} Estimate Flow Audit`;
  els.brandMark.textContent = mark;
  els.brandName.textContent = `${company} audit`;
  els.headline.textContent = `Turn ${company}'s estimate CTA into a faster quote lead.`;
  els.summaryText.textContent = `A quick audit for ${city}: keep the current estimate path, but add a quote-range step that gives homeowners options before your team calls.`;
  els.ctaSeen.textContent = cta;
  els.fitLabel.textContent = instant === "Yes" ? "Campaign quote variant" : "Website estimate button";
  els.ctaRecommendation.textContent = `Point "${cta}" traffic to a quote page that asks for roof basics, returns a ballpark range, and saves the lead for follow-up.`;

  els.salesLink.href = salesUrl;
  els.demoLink.href = demoUrl;
  els.quotePageLink.href = demoUrl;
  els.flyerLink.href = flyerUrl;
  els.checkoutLink.href = checkout || configValue("checkoutUrl") || DEFAULT_CHECKOUT;
  els.copyAuditButton.addEventListener("click", () => {
    copyText(auditSummary(company, city, cta, salesUrl, demoUrl, flyerUrl), "Audit summary copied");
  });
}

applyAudit();
