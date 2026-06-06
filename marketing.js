const params = new URLSearchParams(window.location.search);
const CONFIG = window.ROOFQUOTE_CONFIG || {};
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
];

const els = {
  brandMark: document.querySelector("#brandMark"),
  brandName: document.querySelector("#brandName"),
  demoNavLink: document.querySelector("#demoNavLink"),
  copyLinkButton: document.querySelector("#copyLinkButton"),
  copyTextButton: document.querySelector("#copyTextButton"),
  printButton: document.querySelector("#printButton"),
  headline: document.querySelector("#headline"),
  subhead: document.querySelector("#subhead"),
  flyerCompany: document.querySelector("#flyerCompany"),
  flyerArea: document.querySelector("#flyerArea"),
  qrImage: document.querySelector("#qrImage"),
  shortUrl: document.querySelector("#shortUrl"),
  quoteLink: document.querySelector("#quoteLink"),
  flyerMark: document.querySelector("#flyerMark"),
  printCompany: document.querySelector("#printCompany"),
  printArea: document.querySelector("#printArea"),
  printHeadline: document.querySelector("#printHeadline"),
  printSubhead: document.querySelector("#printSubhead"),
  printQrImage: document.querySelector("#printQrImage"),
  printPhone: document.querySelector("#printPhone"),
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

function quoteUrl() {
  const quoteParams = new URLSearchParams();
  passthroughParams.forEach((key) => {
    const value = params.get(key)?.trim();
    if (value) quoteParams.set(key, value);
  });
  if (!quoteParams.get("checkout") && configValue("checkoutUrl")) quoteParams.set("checkout", configValue("checkoutUrl"));
  if (!quoteParams.get("booking") && configValue("bookingUrl")) quoteParams.set("booking", configValue("bookingUrl"));
  const url = new URL("/demo", window.location.origin);
  url.search = quoteParams.toString();
  url.hash = "estimator";
  return url.toString();
}

function configValue(key) {
  return String(CONFIG[key] || "").trim();
}

function qrCodeUrl(value) {
  const url = new URL("https://api.qrserver.com/v1/create-qr-code/");
  url.searchParams.set("size", "560x560");
  url.searchParams.set("margin", "18");
  url.searchParams.set("data", value);
  return url.toString();
}

function shortDisplayUrl(value) {
  try {
    const url = new URL(value);
    return `${url.host}${url.pathname}${url.search}`;
  } catch {
    return value;
  }
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

function adText(company, city, link) {
  return `${company}: get a fast roof quote range online.

Homeowners in ${city} can scan the QR code, enter roof details, and see a ballpark range before booking a sales call.

Start here: ${link}`;
}

function applyMarketingPreview() {
  const company = params.get("company")?.trim() || "RoofQuote Sprint";
  const city = params.get("city")?.trim() || "your service area";
  const phone = params.get("phone")?.trim();
  const mark = initials(company);
  const link = quoteUrl();
  const qr = qrCodeUrl(link);

  document.title = `${company} Quote Flyer Preview`;
  els.brandMark.textContent = mark;
  els.flyerMark.textContent = mark;
  els.brandName.textContent = `${company} marketing preview`;
  els.flyerCompany.textContent = company;
  els.printCompany.textContent = company;
  els.flyerArea.textContent = `${city} instant roof estimate`;
  els.printArea.textContent = `${city} instant roof estimate`;
  els.headline.textContent = `Give ${city} homeowners a roof quote range before a sales call.`;
  els.subhead.textContent = `${company} can use this QR-ready card on door hangers, ads, business cards, or a website estimate button.`;
  els.printHeadline.textContent = "Need a roof estimate?";
  els.printSubhead.textContent = `Scan for a ballpark range and proposal options from ${company}.`;
  els.printPhone.textContent = phone ? `Questions? Call ${phone}.` : "Fast callback after your quote request.";
  els.shortUrl.textContent = shortDisplayUrl(link);
  els.quoteLink.href = link;
  els.demoNavLink.href = link;
  els.qrImage.src = qr;
  els.printQrImage.src = qr;

  els.copyLinkButton.addEventListener("click", () => copyText(link, "Quote link copied"));
  els.copyTextButton.addEventListener("click", () => copyText(adText(company, city, link), "Ad text copied"));
  els.printButton.addEventListener("click", () => window.print());
}

applyMarketingPreview();
