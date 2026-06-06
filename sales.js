const DEFAULT_CHECKOUT =
  "mailto:?subject=RoofQuote%20Sprint%20setup&body=I%20want%20the%20%24109%20instant%20roof%20quote%20setup.";
const CONFIG = window.ROOFQUOTE_CONFIG || {};

const checkoutLinks = [
  document.querySelector("#navCheckoutLink"),
  document.querySelector("#heroCheckoutLink"),
  document.querySelector("#finalCheckoutLink"),
].filter(Boolean);

const salesContext = document.querySelector("#salesContext");
const fitTitle = document.querySelector("#fitTitle");
const fitSummary = document.querySelector("#fitSummary");
const fitCta = document.querySelector("#fitCta");
const fitInstant = document.querySelector("#fitInstant");
const fitPlacement = document.querySelector("#fitPlacement");
const fitSourceLink = document.querySelector("#fitSourceLink");
const fitContactLink = document.querySelector("#fitContactLink");
const paymentRequestForm = document.querySelector("#paymentRequestForm");
const requestCompanyInput = document.querySelector("#requestCompanyInput");
const requestPhoneInput = document.querySelector("#requestPhoneInput");
const requestWebsiteInput = document.querySelector("#requestWebsiteInput");
const requestServiceAreaInput = document.querySelector("#requestServiceAreaInput");
const requestBookingInput = document.querySelector("#requestBookingInput");
const requestNotesInput = document.querySelector("#requestNotesInput");
const requestSourceField = document.querySelector("#requestSourceField");
const requestCheckoutField = document.querySelector("#requestCheckoutField");
const emailPaymentRequestLink = document.querySelector("#emailPaymentRequestLink");
const smsPaymentRequestLink = document.querySelector("#smsPaymentRequestLink");
const copyPaymentRequestButton = document.querySelector("#copyPaymentRequestButton");
const paymentRequestHint = document.querySelector("#paymentRequestHint");
const paymentRequestStatus = document.querySelector("#paymentRequestStatus");

const demoLinks = [
  document.querySelector("#navDemoLink"),
  document.querySelector("#heroDemoLink"),
  document.querySelector("#bandDemoLink"),
  document.querySelector("#finalDemoLink"),
].filter(Boolean);

const intakeLinks = [document.querySelector("#finalIntakeLink")].filter(Boolean);
const marketingLinks = [document.querySelector("#finalMarketingLink")].filter(Boolean);
const auditLinks = [document.querySelector("#navAuditLink"), document.querySelector("#heroAuditLink"), document.querySelector("#finalAuditLink")].filter(Boolean);

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

function setCheckout(url) {
  const target = !url?.trim() && isManualInvoiceMode() ? "#payment-request" : url?.trim() || configValue("checkoutUrl") || DEFAULT_CHECKOUT;
  checkoutLinks.forEach((link) => {
    link.href = target;
  });
}

function configValue(key) {
  return String(CONFIG[key] || "").trim();
}

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

function safeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

function setOptionalLink(link, value) {
  const href = safeHttpUrl(value || "");
  link.classList.toggle("is-hidden", !href);
  if (href) link.href = href;
}

function resolvedCheckoutUrl(value) {
  return value?.trim() || configValue("checkoutUrl") || (isManualInvoiceMode() ? "manual invoice/payment request" : "");
}

function isManualInvoiceMode() {
  return params.get("payment") === "invoice" || configValue("manualPaymentMode") === "true";
}

function instantLabel(value) {
  if (/^yes$/i.test(value || "")) return "Yes, use a campaign variant";
  if (/^no$/i.test(value || "")) return "No instant range found";
  return "Not confirmed";
}

function applyFitContext(company, city) {
  const cta = params.get("cta")?.trim();
  const instant = params.get("instant")?.trim();
  const source = params.get("source")?.trim();
  const contact = params.get("contact")?.trim();
  const companyLabel = company || "this roofing team";
  const cityText = city ? ` in ${city}` : "";
  const hasProofContext = Boolean(cta || instant || source || contact);

  if (hasProofContext) {
    fitTitle.textContent = cta ? `Turn "${cta}" into a faster quote lead.` : "Add a quote range before the callback.";
    fitSummary.textContent =
      instant && /^yes$/i.test(instant)
        ? `${companyLabel}${cityText} already has an estimate path. This setup works as a campaign-specific quote link, QR flyer, or proposal preview without replacing the current workflow.`
        : `${companyLabel}${cityText} already asks homeowners for an estimate. This setup adds a quote-range step first, so the callback starts with roof basics, timeline, and proposal options.`;
  }

  fitCta.textContent = cta || "Free estimate";
  fitInstant.textContent = instantLabel(instant);
  fitPlacement.textContent = instant && /^yes$/i.test(instant) ? "Campaign quote link" : "Current estimate CTA";
  setOptionalLink(fitSourceLink, source);
  setOptionalLink(fitContactLink, contact);
}

function applyParams() {
  const company = params.get("company")?.trim();
  const city = params.get("city")?.trim();
  const phone = params.get("phone")?.trim();
  const checkout = params.get("checkout")?.trim();
  const booking = params.get("booking")?.trim() || configValue("bookingUrl");
  const source = params.get("source")?.trim();
  const area = params.get("area")?.trim() || city;
  const material = params.get("material")?.trim();
  const deposit = params.get("deposit")?.trim();
  const resolvedCheckout = resolvedCheckoutUrl(checkout);

  if (company) {
    document.querySelector("#salesBrandName").textContent = `${company} demo`;
    document.querySelector("#salesBrandMark").textContent = initials(company);
    document.title = `${company} Instant Roof Quote Page`;
    salesContext.textContent = city ? `Personalized for ${company} in ${city}.` : `Personalized for ${company}.`;
  } else if (city) {
    salesContext.textContent = `Built for roofing teams serving ${city}.`;
  }

  applyFitContext(company, city);

  const demoQuery = new URLSearchParams();
  passthroughParams.forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) demoQuery.set(key, value);
  });
  if (!demoQuery.get("checkout") && configValue("checkoutUrl")) demoQuery.set("checkout", configValue("checkoutUrl"));
  if (!demoQuery.get("booking") && booking) demoQuery.set("booking", booking);

  const demoHref = `./index.html${demoQuery.toString() ? `?${demoQuery}` : ""}#estimator`;
  demoLinks.forEach((link) => {
    link.href = demoHref;
  });
  intakeLinks.forEach((link) => {
    link.href = `./intake.html${demoQuery.toString() ? `?${demoQuery}` : ""}`;
  });
  marketingLinks.forEach((link) => {
    link.href = `./marketing.html${demoQuery.toString() ? `?${demoQuery}` : ""}`;
  });
  auditLinks.forEach((link) => {
    link.href = `./audit.html${demoQuery.toString() ? `?${demoQuery}` : ""}`;
  });

  if (checkout) {
    setCheckout(checkout);
  } else {
    setCheckout("");
  }

  if (paymentRequestForm) {
    requestCompanyInput.value = company || "";
    requestPhoneInput.value = phone || "";
    requestWebsiteInput.value = safeHttpUrl(source);
    requestServiceAreaInput.value = area || "";
    requestBookingInput.value = safeHttpUrl(booking);
    const noteBits = [
      material ? `Preferred material: ${material}` : "",
      deposit ? `Deposit percent: ${deposit}` : "",
      params.get("payment") === "invoice" ? "Manual invoice/payment-link request." : "",
    ].filter(Boolean);
    requestNotesInput.value = noteBits.join("\n");
    requestSourceField.value = window.location.href;
    requestCheckoutField.value = resolvedCheckout;
    updatePaymentRequestActions();
  }
}

applyParams();

function paymentField(name) {
  const field = paymentRequestForm?.elements?.[name];
  return field ? String(field.value || "").trim() : "";
}

function normalizedPhone(value) {
  return String(value || "").replace(/[^\d+]/g, "");
}

function smsHref(phone, body) {
  const normalized = normalizedPhone(phone);
  if (!normalized) return "";
  return `sms:${normalized}?&body=${encodeURIComponent(body)}`;
}

function paymentRequestText() {
  const checkout = requestCheckoutField?.value || resolvedCheckoutUrl(params.get("checkout")?.trim());
  return [
    "RoofQuote Sprint $109 setup payment request",
    "",
    "Company: " + (paymentField("company") || "[company]"),
    "Name: " + (paymentField("contact_name") || "[name]"),
    "Email: " + (paymentField("contact_email") || "[email]"),
    "Phone: " + (paymentField("contact_phone") || "[phone]"),
    "Website: " + (paymentField("website") || "[website]"),
    "Service area: " + (paymentField("service_area") || "[service area]"),
    "Booking link: " + (paymentField("booking_link") || "[none]"),
    "Needed by: " + (paymentField("needed_by") || "Within 48 hours"),
    "Payment request path: " + (paymentField("payment_request_type") || "Send a Stripe invoice"),
    "Checkout/payment URL: " + (checkout || "[send invoice/payment link manually]"),
    "",
    "Setup notes:",
    paymentField("setup_notes") || "[none]",
    "",
    "Source: " + window.location.href,
  ].join("\n");
}

function paymentRequestSubject() {
  return `RoofQuote Sprint payment request - ${paymentField("company") || "roofing setup"}`;
}

function copyText(text, message) {
  function fallbackCopy() {
    const temp = document.createElement("textarea");
    temp.value = text;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }

  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(
      () => setPaymentRequestStatus(message),
      () => {
        fallbackCopy();
        setPaymentRequestStatus(message);
      },
    );
    return;
  }

  fallbackCopy();
  setPaymentRequestStatus(message);
}

function setPaymentRequestStatus(message) {
  if (!paymentRequestStatus) return;
  paymentRequestStatus.textContent = message || "";
}

function manualPaymentCopyMessage() {
  return configValue("contactEmail")
    ? "Payment request copied"
    : "Payment request copied. Reply to the person who sent this link, or paste it into your email/text thread.";
}

function updatePaymentRequestActions() {
  if (!paymentRequestForm || !emailPaymentRequestLink) return;

  const body = paymentRequestText();
  const subject = paymentRequestSubject();
  const contactEmail = configValue("contactEmail");
  const contactPhone = configValue("contactPhone");

  emailPaymentRequestLink.href = `mailto:${encodeURIComponent(contactEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  emailPaymentRequestLink.textContent = contactEmail ? "Email request" : "Open email draft";
  if (copyPaymentRequestButton) {
    copyPaymentRequestButton.textContent = contactEmail ? "Copy request" : "Copy request to reply";
  }
  if (paymentRequestHint) {
    paymentRequestHint.textContent = contactEmail
      ? "Use this if you want an invoice or payment link sent before setup starts."
      : "No direct inbox is configured on this public page. Copy the request and reply to the person who sent you this link.";
  }

  if (smsPaymentRequestLink) {
    const href = smsHref(contactPhone, body);
    smsPaymentRequestLink.classList.toggle("is-hidden", !href);
    if (href) smsPaymentRequestLink.href = href;
  }
}

if (paymentRequestForm) {
  paymentRequestForm.addEventListener("input", updatePaymentRequestActions);
  paymentRequestForm.addEventListener("change", updatePaymentRequestActions);
  paymentRequestForm.addEventListener("submit", (event) => {
    if (!isManualInvoiceMode()) return;
    event.preventDefault();
    updatePaymentRequestActions();
    if (configValue("contactEmail")) {
      window.location.href = emailPaymentRequestLink.href;
      setPaymentRequestStatus("Email draft opened");
      return;
    }
    copyText(paymentRequestText(), manualPaymentCopyMessage());
  });
}

if (copyPaymentRequestButton) {
  copyPaymentRequestButton.addEventListener("click", () => {
    updatePaymentRequestActions();
    copyText(paymentRequestText(), manualPaymentCopyMessage());
  });
}
