const STORAGE_KEY = "roofquote-sprint-leads";
const CHECKOUT_KEY = "roofquote-sprint-checkout-url";
const HOSTED_LEAD_FORM = "roofquote_lead";
const CONFIG = window.ROOFQUOTE_CONFIG || {};

const materialProfiles = {
  threeTab: {
    label: "3-tab shingles",
    unit: 5.75,
    waste: 0.09,
    note: "budget shingle system",
  },
  architectural: {
    label: "architectural shingles",
    unit: 6.95,
    waste: 0.12,
    note: "laminated shingle system",
  },
  metal: {
    label: "standing seam metal",
    unit: 12.75,
    waste: 0.1,
    note: "metal roof system",
  },
  tile: {
    label: "tile roof",
    unit: 16.5,
    waste: 0.14,
    note: "tile roof system",
  },
};

const factors = {
  pitch: {
    low: { label: "low pitch", value: 0.94 },
    standard: { label: "standard pitch", value: 1 },
    steep: { label: "steep pitch", value: 1.14 },
  },
  complexity: {
    simple: { label: "simple roofline", value: 0.96 },
    moderate: { label: "moderate roofline", value: 1.08 },
    complex: { label: "cut-up roofline", value: 1.22 },
  },
  timeline: {
    browsing: { label: "browsing", score: 4, days: "3-5 days" },
    month: { label: "this month", score: 12, days: "2-3 days" },
    urgent: { label: "urgent leak", score: 20, days: "1-2 days" },
  },
};

const addOns = {
  gutters: { label: "gutter replacement", price: 1850, score: 4 },
  skylights: { label: "skylight flashing", price: 850, score: 3 },
  ventilation: { label: "ridge ventilation", price: 720, score: 3 },
  permit: { label: "permit handling", price: 475, score: 1 },
};

const stages = ["New", "Quoted", "Follow-up", "Won"];
const paymentStatuses = ["Draft", "Requested", "Paid"];
const stageConfig = {
  New: {
    action: "Call to confirm roof basics",
    dueHours: 1,
  },
  Quoted: {
    action: "Book measurement review",
    dueHours: 4,
  },
  "Follow-up": {
    action: "Send decision nudge",
    dueHours: 24,
  },
  Won: {
    action: "Send production handoff",
    dueHours: Infinity,
  },
};
const paymentStatusConfig = {
  Draft: {
    label: "Draft ready",
    action: "Copy the deposit request after the quote is reviewed.",
  },
  Requested: {
    label: "Deposit requested",
    action: "Follow up until the Stripe invoice or payment link is paid.",
  },
  Paid: {
    label: "Deposit paid",
    action: "Move into measurement, color, supplier, and production handoff.",
  },
};
const materialUnitParams = {
  unitThreeTab: "threeTab",
  unitArchitectural: "architectural",
  unitMetal: "metal",
  unitTile: "tile",
};
const demoFieldParams = {
  area: "area",
  stories: "stories",
  pitch: "pitch",
  complexity: "complexity",
  tearOff: "tearOff",
  timeline: "timeline",
  margin: "margin",
  deposit: "deposit",
};

let bookingUrl = "";

const pitchText =
  "Quick idea: I built a lightweight instant roof quote page for roofers who want the online estimate workflow without moving into a full CRM. It gives homeowners good/better/best pricing, captures the lead, creates starter material draft details, and shows which quote leads need follow-up. I’m doing the first setup for $109 this week. Want me to mock it up with your logo and pricing?";

const salesScript = [
  "Subject: quick online estimate page for {{Company}}",
  "Hey {{FirstName}}, saw {{Company}} is booking roof estimates in {{City}}.",
  "I built a small instant quote page for roofers: homeowner enters address, roof size/material/timeline, then gets good/better/best options while you capture the lead.",
  "It is not a full CRM. It is a fast lead-capture page you can put on your site, Google Business Profile, door hangers, or Facebook ads.",
  "I’m setting up the first few for $109 this week, including your logo/colors, pricing defaults, starter material draft, lead board, follow-up copy, and CSV export. If it does not feel useful after the setup call, I’ll refund it.",
  "Worth a 10 minute look?",
].map((line) => line.replace(/\{\{/g, "<strong>{{").replace(/\}\}/g, "}}</strong>"));

const els = {
  form: document.querySelector("#quoteForm"),
  optionStack: document.querySelector("#optionStack"),
  leadScorePill: document.querySelector("#leadScorePill"),
  proposalAddress: document.querySelector("#proposalAddress"),
  priceRange: document.querySelector("#priceRange"),
  wasteFactor: document.querySelector("#wasteFactor"),
  squaresCount: document.querySelector("#squaresCount"),
  depositAmount: document.querySelector("#depositAmount"),
  monthlyAmount: document.querySelector("#monthlyAmount"),
  installWindow: document.querySelector("#installWindow"),
  scopeText: document.querySelector("#scopeText"),
  paymentOptionName: document.querySelector("#paymentOptionName"),
  paymentInvoiceAmount: document.querySelector("#paymentInvoiceAmount"),
  paymentBalanceAmount: document.querySelector("#paymentBalanceAmount"),
  paymentRequestNote: document.querySelector("#paymentRequestNote"),
  reportLeadFit: document.querySelector("#reportLeadFit"),
  reportMeasuredArea: document.querySelector("#reportMeasuredArea"),
  reportBundles: document.querySelector("#reportBundles"),
  reportUnderlayment: document.querySelector("#reportUnderlayment"),
  reportMeasurementNote: document.querySelector("#reportMeasurementNote"),
  reportQualification: document.querySelector("#reportQualification"),
  reportNextStep: document.querySelector("#reportNextStep"),
  materialOrderBundles: document.querySelector("#materialOrderBundles"),
  materialOrderUnderlayment: document.querySelector("#materialOrderUnderlayment"),
  materialOrderStarter: document.querySelector("#materialOrderStarter"),
  materialOrderAccessories: document.querySelector("#materialOrderAccessories"),
  materialOrderNote: document.querySelector("#materialOrderNote"),
  toast: document.querySelector("#toast"),
  leadBoard: document.querySelector("#leadBoard"),
  pipelineStats: document.querySelector("#pipelineStats"),
  checkoutUrlInput: document.querySelector("#checkoutUrlInput"),
  checkoutButton: document.querySelector("#checkoutButton"),
  salesScript: document.querySelector("#salesScript"),
  brandMark: document.querySelector("#brandMark"),
  brandName: document.querySelector("#brandName"),
  brandSubtitle: document.querySelector("#brandSubtitle"),
};

let currentEstimate = null;

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function number(value) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value);
}

function plural(value, singular, pluralLabel = `${singular}s`) {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

function stageDetails(stage) {
  return stageConfig[stage] || stageConfig.New;
}

function validStage(stage) {
  return stages.includes(stage) ? stage : "New";
}

function validPaymentStatus(status) {
  return paymentStatuses.includes(status) ? status : "Draft";
}

function paymentDetails(status) {
  return paymentStatusConfig[validPaymentStatus(status)] || paymentStatusConfig.Draft;
}

function normalizeLead(lead) {
  const createdAt = lead.createdAt || new Date().toISOString();
  const stage = validStage(lead.stage);
  const paymentStatus = validPaymentStatus(lead.paymentStatus || (stage === "Won" ? "Paid" : "Draft"));
  const updatedAt = lead.updatedAt || createdAt;
  return {
    ...lead,
    id: lead.id || crypto.randomUUID(),
    createdAt,
    updatedAt,
    stage,
    paymentStatus,
    nextAction: lead.nextAction || stageDetails(stage).action,
    materialOrder: lead.materialOrder || "not captured",
    timeline: lead.timeline || "not captured",
    total: Number(lead.total || 0),
    score: Number(lead.score || 0),
    depositPercent: Number(lead.depositPercent || 0),
    depositAmount: Number(lead.depositAmount || 0),
    balanceAmount: Number(lead.balanceAmount || 0),
  };
}

function getLeads() {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map(normalizeLead);
  } catch {
    return [];
  }
}

function setLeads(leads) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(leads));
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => {
    els.toast.classList.remove("is-visible");
  }, 2400);
}

async function copyText(text, confirmation = "Copied") {
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
  showToast(confirmation);
}

function getFormData() {
  const data = new FormData(els.form);
  const selectedAddOns = data.getAll("addon");
  return {
    homeowner: String(data.get("homeowner") || "").trim(),
    phone: String(data.get("phone") || "").trim(),
    email: String(data.get("email") || "").trim(),
    address: String(data.get("address") || "").trim(),
    area: Math.max(600, Number(data.get("area") || 0)),
    stories: Number(data.get("stories") || 1),
    pitch: String(data.get("pitch") || "standard"),
    complexity: String(data.get("complexity") || "moderate"),
    material: String(data.get("material") || "architectural"),
    tearOff: Number(data.get("tearOff") || 0),
    timeline: String(data.get("timeline") || "month"),
    margin: Math.max(8, Number(data.get("margin") || 22)) / 100,
    deposit: Math.max(5, Number(data.get("deposit") || 25)) / 100,
    addOns: selectedAddOns,
  };
}

function calculateEstimate() {
  const input = getFormData();
  const material = materialProfiles[input.material];
  const pitch = factors.pitch[input.pitch];
  const complexity = factors.complexity[input.complexity];
  const timeline = factors.timeline[input.timeline];
  const storyFactor = 1 + Math.max(0, input.stories - 1) * 0.07;
  const waste = material.waste + (input.complexity === "complex" ? 0.04 : 0) + (input.pitch === "steep" ? 0.02 : 0);
  const measuredArea = input.area * (1 + waste);
  const tearOffCost = input.area * input.tearOff * 1.2;
  const addOnTotal = input.addOns.reduce((sum, key) => sum + addOns[key].price, 0);
  const adjustedUnit = material.unit * pitch.value * complexity.value * storyFactor;
  const directCost = measuredArea * adjustedUnit + tearOffCost + addOnTotal;
  const baseTotal = directCost * (1 + input.margin);
  const options = [
    {
      key: "good",
      label: "Good",
      title: "Repair-ready replacement",
      body: `${material.note}, standard underlayment, cleanup, and workmanship warranty.`,
      total: baseTotal * 0.94,
      accent: "green",
    },
    {
      key: "better",
      label: "Better",
      title: "Most-booked system",
      body: `${material.note}, upgraded underlayment, ventilation tune-up, and photo closeout.`,
      total: baseTotal * 1.08 + 680,
      accent: "teal",
      featured: true,
    },
    {
      key: "best",
      label: "Best",
      title: "Premium protection",
      body: `${material.note}, premium accessories, enhanced warranty, and priority install window.`,
      total: baseTotal * 1.24 + 1250,
      accent: "blue",
    },
  ];

  const middle = options[1].total;
  const leadScore = Math.min(
    99,
    Math.round(
      38 +
        timeline.score +
        Math.min(18, input.area / 180) +
        (input.phone ? 7 : 0) +
        (input.email ? 7 : 0) +
        input.addOns.length * 3 +
        (input.tearOff > 0 ? 4 : 0),
    ),
  );

  return {
    input,
    material,
    pitch,
    complexity,
    timeline,
    waste,
    measuredArea,
    squares: measuredArea / 100,
    options,
    rangeLow: options[0].total * 0.96,
    rangeHigh: options[2].total * 1.03,
    leadScore,
    depositAmount: middle * input.deposit,
    balanceAmount: middle - middle * input.deposit,
    monthlyAmount: (middle * 1.11) / 60,
    installWindow: timeline.days,
    addOnLabels: input.addOns.map((key) => addOns[key].label),
    materialPlan: {
      bundles: Math.ceil((measuredArea / 100) * 3),
      underlaymentRolls: Math.ceil(measuredArea / 1000),
      starterRolls: Math.max(1, Math.ceil((measuredArea / 100) / 18)),
      accessoryAllowance: input.addOns.length + 2,
      capNailsBoxes: Math.max(1, Math.ceil((measuredArea / 100) / 24)),
    },
  };
}

function leadFit(estimate) {
  if (estimate.leadScore >= 82) return "Hot lead";
  if (estimate.leadScore >= 62) return "Warm lead";
  return "Needs nurture";
}

function qualificationText(estimate) {
  const addOns = estimate.addOnLabels.length ? ` Add-ons requested: ${estimate.addOnLabels.join(", ")}.` : "";
  return `${leadFit(estimate)} at score ${estimate.leadScore}: ${estimate.timeline.label} timeline, ${number(
    estimate.input.area,
  )} sq ft self-reported roof area, ${estimate.material.label}, ${estimate.input.tearOff} tear-off layer(s).${addOns}`;
}

function nextStepText(estimate) {
  return `Next step: confirm measurements, decking, ventilation, and material choice before final contract. This snapshot is for qualification and proposal review, not a production measurement report.`;
}

function materialOrderSummary(estimate) {
  return `${estimate.materialPlan.bundles} bundles, ${plural(estimate.materialPlan.underlaymentRolls, "underlayment roll")}, ${plural(
    estimate.materialPlan.starterRolls,
    "starter/ridge line",
  )}, ${plural(estimate.materialPlan.capNailsBoxes, "cap/nail box")}, ${plural(estimate.materialPlan.accessoryAllowance, "accessory/check item")}`;
}

function materialOrderText() {
  const estimate = currentEstimate || calculateEstimate();
  const addOns = estimate.addOnLabels.length ? estimate.addOnLabels.join(", ") : "none selected";

  return `RoofQuote material order draft

Address: ${estimate.input.address || "n/a"}
Homeowner: ${estimate.input.homeowner || "n/a"}
Material: ${estimate.material.label}
Measured area with waste: ${number(estimate.measuredArea)} sq ft (${number(estimate.squares)} squares)
Waste factor: ${Math.round(estimate.waste * 100)}%

Starter list:
- Shingles: ${estimate.materialPlan.bundles} bundles
- Underlayment: ${plural(estimate.materialPlan.underlaymentRolls, "roll")}
- Starter/ridge allowance: ${plural(estimate.materialPlan.starterRolls, "line")}
- Cap/nail boxes: ${plural(estimate.materialPlan.capNailsBoxes, "box", "boxes")}
- Accessory/checklist allowance: ${estimate.materialPlan.accessoryAllowance} items
- Add-ons to confirm: ${addOns}

Verification note: confirm measurements, waste, color, ventilation, flashing, decking, and supplier availability before ordering. This is a pre-measurement sales draft, not a final production order.`;
}

function featuredOption(estimate) {
  return estimate.options.find((option) => option.featured) || estimate.options[1] || estimate.options[0];
}

function depositRequestText() {
  const estimate = currentEstimate || calculateEstimate();
  const selected = featuredOption(estimate);
  const depositPercent = Math.round(estimate.input.deposit * 100);

  return `RoofQuote payment request draft

Homeowner: ${estimate.input.homeowner || "n/a"}
Address: ${estimate.input.address || "n/a"}
Phone: ${estimate.input.phone || "n/a"}
Email: ${estimate.input.email || "n/a"}

Selected proposal: ${selected.label}: ${selected.title}
Proposal total: ${money(selected.total)}
Deposit request: ${money(estimate.depositAmount)} (${depositPercent}%)
Remaining balance after deposit: ${money(estimate.balanceAmount)}

Payment note:
Please use this link to pay the ${depositPercent}% project deposit:
[PASTE INVOICE OR PAYMENT LINK]

Once the deposit is paid, we will confirm final measurements, decking, ventilation, material color, supplier availability, and install timing before production.`;
}

function renderEstimate() {
  currentEstimate = calculateEstimate();
  const estimate = currentEstimate;
  const { input } = estimate;
  const selected = featuredOption(estimate);
  const depositPercent = Math.round(input.deposit * 100);

  els.leadScorePill.textContent = `Score ${estimate.leadScore}`;
  els.proposalAddress.textContent = input.address || "Unaddressed roof";
  els.priceRange.textContent = `${money(estimate.rangeLow)} - ${money(estimate.rangeHigh)}`;
  els.wasteFactor.textContent = `${Math.round(estimate.waste * 100)}%`;
  els.squaresCount.textContent = number(estimate.squares);
  els.depositAmount.textContent = money(estimate.depositAmount);
  els.monthlyAmount.textContent = money(estimate.monthlyAmount);
  els.installWindow.textContent = estimate.installWindow;
  els.paymentOptionName.textContent = selected.label;
  els.paymentInvoiceAmount.textContent = money(estimate.depositAmount);
  els.paymentBalanceAmount.textContent = money(estimate.balanceAmount);
  els.paymentRequestNote.textContent = `${depositPercent}% deposit draft for ${selected.label}: ${selected.title}. Copy this into Stripe invoice/payment request notes after measurements are confirmed.`;
  els.reportLeadFit.textContent = leadFit(estimate);
  els.reportMeasuredArea.textContent = `${number(estimate.measuredArea)} sq ft`;
  els.reportBundles.textContent = String(estimate.materialPlan.bundles);
  els.reportUnderlayment.textContent = plural(estimate.materialPlan.underlaymentRolls, "roll");
  els.reportMeasurementNote.textContent = "Verify before production";
  els.reportQualification.textContent = qualificationText(estimate);
  els.reportNextStep.textContent = nextStepText(estimate);
  els.materialOrderBundles.textContent = `${estimate.materialPlan.bundles} bundles`;
  els.materialOrderUnderlayment.textContent = plural(estimate.materialPlan.underlaymentRolls, "roll");
  els.materialOrderStarter.textContent = plural(estimate.materialPlan.starterRolls, "line");
  els.materialOrderAccessories.textContent = `${estimate.materialPlan.accessoryAllowance} checks`;
  els.materialOrderNote.textContent = `Draft supplier list: ${materialOrderSummary(estimate)}. Verify color, ventilation, flashing, decking, and final measurement before ordering.`;

  const addOnPhrase = estimate.addOnLabels.length ? ` Includes ${estimate.addOnLabels.join(", ")}.` : "";
  els.scopeText.textContent = `${number(input.area)} sq ft ${estimate.material.label} replacement on a ${estimate.pitch.label}, ${estimate.complexity.label}.${addOnPhrase} Recommended next step: confirm measurements, inspect decking, and lock the selected option.`;

  els.optionStack.innerHTML = estimate.options
    .map(
      (option) => `
        <article class="quote-option ${option.featured ? "is-featured" : ""}">
          <div>
            <h3>${option.label}: ${option.title}</h3>
            <p>${option.body}</p>
          </div>
          <strong>${money(option.total)}</strong>
        </article>
      `,
    )
    .join("");
}

function leadFromEstimate(stage = "New") {
  const estimate = currentEstimate || calculateEstimate();
  const preferred = estimate.options.find((option) => option.featured) || estimate.options[1];
  const now = new Date().toISOString();
  const normalizedStage = validStage(stage);
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    stage: normalizedStage,
    paymentStatus: "Draft",
    nextAction: stageDetails(normalizedStage).action,
    homeowner: estimate.input.homeowner || "Unnamed homeowner",
    phone: estimate.input.phone,
    email: estimate.input.email,
    address: estimate.input.address || "Unaddressed roof",
    material: estimate.material.label,
    area: estimate.input.area,
    score: estimate.leadScore,
    total: Math.round(preferred.total),
    range: `${money(estimate.rangeLow)} - ${money(estimate.rangeHigh)}`,
    depositPercent: Math.round(estimate.input.deposit * 100),
    depositAmount: Math.round(estimate.depositAmount),
    balanceAmount: Math.round(estimate.balanceAmount),
    materialOrder: materialOrderSummary(estimate),
    timeline: estimate.timeline.label,
  };
}

function hostedLeadPayload(lead) {
  return {
    "form-name": HOSTED_LEAD_FORM,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
    stage: lead.stage,
    paymentStatus: lead.paymentStatus,
    nextAction: lead.nextAction || stageDetails(lead.stage).action,
    actionStatus: actionStatusText(lead),
    homeowner: lead.homeowner,
    phone: lead.phone,
    email: lead.email,
    address: lead.address,
    material: lead.material,
    area: lead.area,
    score: lead.score,
    total: lead.total,
    range: lead.range,
    depositPercent: lead.depositPercent,
    depositAmount: lead.depositAmount,
    balanceAmount: lead.balanceAmount,
    materialOrder: lead.materialOrder,
    timeline: lead.timeline,
    sourcePage: window.location.href,
  };
}

function shouldSubmitHostedLead() {
  return window.location.protocol === "https:" && !["localhost", "127.0.0.1"].includes(window.location.hostname);
}

async function submitHostedLead(lead) {
  if (!shouldSubmitHostedLead()) return false;
  const body = new URLSearchParams(hostedLeadPayload(lead));

  try {
    const response = await fetch("/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    return response.ok;
  } catch (error) {
    console.warn("Hosted lead capture failed", error);
    return false;
  }
}

function saveLead() {
  const leads = getLeads();
  const lead = leadFromEstimate();
  leads.unshift(lead);
  setLeads(leads);
  renderLeads();
  showToast(`${lead.homeowner} saved`);
  submitHostedLead(lead).then((submitted) => {
    if (submitted) {
      showToast(`${lead.homeowner} saved and submitted`);
    }
  });
}

function htmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hoursSince(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, (Date.now() - date.getTime()) / 36e5);
}

function actionStatusText(lead) {
  const stage = validStage(lead.stage);
  const dueHours = stageDetails(stage).dueHours;
  if (dueHours === Infinity) return "Closed";

  const remaining = dueHours - hoursSince(lead.updatedAt || lead.createdAt);
  if (remaining <= 0) return "Due now";
  if (remaining < 1) return "Due soon";
  if (remaining < 24) return `Due in ${Math.ceil(remaining)}h`;
  return `Due in ${Math.ceil(remaining / 24)}d`;
}

function paymentStatusClass(lead) {
  const status = validPaymentStatus(lead.paymentStatus);
  if (status === "Paid") return "is-payment-paid";
  if (status === "Requested") return "is-payment-requested";
  return "is-payment-draft";
}

function paymentActionText(lead) {
  const details = paymentDetails(lead.paymentStatus);
  if (validPaymentStatus(lead.paymentStatus) === "Draft" && lead.stage === "New") {
    return "Qualify first, then send the deposit request from the selected proposal.";
  }
  return details.action;
}

function isActionDue(lead) {
  const dueHours = stageDetails(validStage(lead.stage)).dueHours;
  return dueHours !== Infinity && hoursSince(lead.updatedAt || lead.createdAt) >= dueHours;
}

function formatRelativeTime(isoDate) {
  const elapsed = hoursSince(isoDate);
  if (elapsed < 0.1) return "just now";
  if (elapsed < 1) return `${Math.max(1, Math.round(elapsed * 60))}m ago`;
  if (elapsed < 24) return `${Math.round(elapsed)}h ago`;
  return `${Math.round(elapsed / 24)}d ago`;
}

function leadStatusClass(lead) {
  if (lead.stage === "Won") return "is-won";
  if (isActionDue(lead)) return "is-due";
  if (Number(lead.score || 0) >= 82) return "is-hot";
  return "";
}

function renderPipelineStats(leads) {
  const openLeads = leads.filter((lead) => lead.stage !== "Won");
  const dueLeads = openLeads.filter(isActionDue);
  const hotLeads = openLeads.filter((lead) => Number(lead.score || 0) >= 82);
  const pipelineValue = openLeads.reduce((sum, lead) => sum + Number(lead.total || 0), 0);
  const wonValue = leads.filter((lead) => lead.stage === "Won").reduce((sum, lead) => sum + Number(lead.total || 0), 0);
  const requestedDepositValue = leads
    .filter((lead) => validPaymentStatus(lead.paymentStatus) === "Requested")
    .reduce((sum, lead) => sum + Number(lead.depositAmount || 0), 0);
  const paidDepositValue = leads
    .filter((lead) => validPaymentStatus(lead.paymentStatus) === "Paid")
    .reduce((sum, lead) => sum + Number(lead.depositAmount || 0), 0);

  els.pipelineStats.innerHTML = [
    ["Open", String(openLeads.length), "Active leads"],
    ["Due", String(dueLeads.length), "Follow-ups"],
    ["Hot", String(hotLeads.length), "Score 82+"],
    ["Pipeline", money(pipelineValue), "Open value"],
    ["Won", money(wonValue), "Closed value"],
    ["Deposits", money(requestedDepositValue + paidDepositValue), "Requested or paid"],
  ]
    .map(
      ([label, value, detail]) => `
        <div class="pipeline-stat">
          <span>${label}</span>
          <strong>${value}</strong>
          <small>${detail}</small>
        </div>
      `,
    )
    .join("");
}

function renderLeads() {
  const leads = getLeads();
  renderPipelineStats(leads);
  els.leadBoard.innerHTML = stages
    .map((stage) => {
      const stageLeads = leads.filter((lead) => lead.stage === stage);
      const cards = stageLeads
        .map((lead) => {
          const leadId = htmlEscape(lead.id);
          const stageAction = stageDetails(lead.stage).action;
          const paymentStatus = validPaymentStatus(lead.paymentStatus);
          const payment = paymentDetails(paymentStatus);
          return `
          <article class="lead-card ${leadStatusClass(lead)}">
            <div class="lead-card-top">
              <div>
                <h3>${htmlEscape(lead.homeowner)}</h3>
                <p class="lead-meta">${htmlEscape(lead.address)}<br>${htmlEscape(lead.material)} · ${number(Number(lead.area || 0))} sq ft</p>
              </div>
              <span class="lead-status-chip">${htmlEscape(actionStatusText(lead))}</span>
            </div>
            <strong>${money(lead.total)}</strong>
            <p class="lead-meta">Score ${lead.score} · ${htmlEscape(lead.timeline)} · deposit ${money(lead.depositAmount)} · touched ${formatRelativeTime(lead.updatedAt || lead.createdAt)}</p>
            <div class="lead-payment ${paymentStatusClass(lead)}">
              <div class="lead-payment-top">
                <span>${htmlEscape(payment.label)}</span>
                <select data-lead-payment="${leadId}" aria-label="Payment status">
                  ${paymentStatuses.map((item) => `<option value="${item}" ${item === paymentStatus ? "selected" : ""}>${item}</option>`).join("")}
                </select>
              </div>
              <div class="lead-payment-grid">
                <div>
                  <span>Deposit</span>
                  <strong>${money(lead.depositAmount)}</strong>
                </div>
                <div>
                  <span>Balance</span>
                  <strong>${money(lead.balanceAmount)}</strong>
                </div>
              </div>
              <p>${htmlEscape(paymentActionText(lead))}</p>
            </div>
            <p class="next-action">${htmlEscape(stageAction)}</p>
            <div class="lead-actions">
              <select data-lead-stage="${leadId}" aria-label="Lead stage">
                ${stages.map((item) => `<option value="${item}" ${item === lead.stage ? "selected" : ""}>${item}</option>`).join("")}
              </select>
              <button class="ghost-button" type="button" data-copy-lead="${leadId}" title="Copy lead">
                <i data-lucide="copy" aria-hidden="true"></i>
              </button>
              <button class="ghost-button" type="button" data-copy-lead-followup="${leadId}" title="Copy next follow-up">
                <i data-lucide="message-square-text" aria-hidden="true"></i>
              </button>
              <button class="ghost-button" type="button" data-copy-lead-invoice="${leadId}" title="Copy invoice draft">
                <i data-lucide="receipt" aria-hidden="true"></i>
              </button>
              <button class="ghost-button" type="button" data-copy-lead-payment="${leadId}" title="Copy payment nudge">
                <i data-lucide="dollar-sign" aria-hidden="true"></i>
              </button>
              ${
                lead.stage === "Won"
                  ? ""
                  : `<button class="ghost-button" type="button" data-mark-lead-won="${leadId}" title="Mark won">
                      <i data-lucide="check-circle" aria-hidden="true"></i>
                    </button>`
              }
            </div>
          </article>
        `;
        })
        .join("");

      return `
        <section class="board-column">
          <header>
            <h2>${stage}</h2>
            <span class="lead-count">${stageLeads.length}</span>
          </header>
          <div class="lead-list">
            ${cards || '<div class="empty-board">No leads</div>'}
          </div>
        </section>
      `;
    })
    .join("");

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function updateLeadStage(id, stage) {
  const normalizedStage = validStage(stage);
  const now = new Date().toISOString();
  const leads = getLeads().map((lead) =>
    lead.id === id
      ? {
          ...lead,
          stage: normalizedStage,
          paymentStatus: normalizedStage === "Won" ? "Paid" : validPaymentStatus(lead.paymentStatus),
          updatedAt: now,
          nextAction: stageDetails(normalizedStage).action,
          ...(normalizedStage === "Won" ? { wonAt: now } : {}),
        }
      : lead,
  );
  setLeads(leads);
  renderLeads();
}

function updateLeadPaymentStatus(id, status) {
  const normalizedStatus = validPaymentStatus(status);
  const now = new Date().toISOString();
  const leads = getLeads().map((lead) => {
    if (lead.id !== id) return lead;
    const nextStage = normalizedStatus === "Paid" ? "Won" : lead.stage === "Won" ? "Follow-up" : lead.stage;
    return {
      ...lead,
      stage: nextStage,
      paymentStatus: normalizedStatus,
      updatedAt: now,
      nextAction: stageDetails(nextStage).action,
      ...(normalizedStatus === "Paid" ? { wonAt: now } : {}),
    };
  });
  setLeads(leads);
  renderLeads();
}

function copyLead(id) {
  const lead = getLeads().find((item) => item.id === id);
  if (!lead) return;
  copyText(
    `${lead.homeowner} - ${lead.address}\n${lead.range}\n${lead.material}, ${lead.area} sq ft\nScore: ${lead.score} · Stage: ${lead.stage} · ${actionStatusText(lead)}\nNext action: ${stageDetails(lead.stage).action}\nInvoice status: ${paymentDetails(lead.paymentStatus).label}\nDeposit: ${money(lead.depositAmount)} (${lead.depositPercent || "n/a"}%) · Balance: ${money(lead.balanceAmount)}\nMaterial draft: ${lead.materialOrder || "n/a"}\nPhone: ${lead.phone || "n/a"}\nEmail: ${lead.email || "n/a"}`,
    "Lead copied",
  );
}

function firstName(name) {
  return String(name || "there").trim().split(/\s+/)[0] || "there";
}

function leadFollowupText(lead) {
  const name = firstName(lead.homeowner);
  const appointmentLine = bookingUrl ? `\n\nBooking link: ${bookingUrl}` : "";
  const sharedDetails = `\n\nAddress: ${lead.address}\nRange: ${lead.range}\nDeposit: ${money(lead.depositAmount)} (${lead.depositPercent || "n/a"}%)\nBalance: ${money(lead.balanceAmount)}\nMaterial: ${lead.material}\nMaterial draft: ${lead.materialOrder || "n/a"}`;

  if (lead.stage === "Quoted") {
    return `Hi ${name}, quick follow-up on the roof range for ${lead.address}. The estimate is still showing ${lead.range}, with ${lead.material} as the current material choice.\n\nThe next step is a measurement review so we can confirm decking, ventilation, and final scope. Do you want the earliest appointment this week or a later slot?${appointmentLine}${sharedDetails}`;
  }

  if (lead.stage === "Follow-up") {
    return `Hi ${name}, checking whether you want me to keep this roof estimate active or close it out for now.\n\nI can either book the measurement review or update the proposal options if the material/timeline changed.${appointmentLine}${sharedDetails}`;
  }

  if (lead.stage === "Won") {
    return `Production handoff for ${lead.homeowner}\n\n${lead.address}\nPhone: ${lead.phone || "n/a"}\nEmail: ${lead.email || "n/a"}\nSelected range: ${lead.range}\nDeposit: ${money(lead.depositAmount)} (${lead.depositPercent || "n/a"}%)\nBalance: ${money(lead.balanceAmount)}\nMaterial: ${lead.material}\nStarter material draft: ${lead.materialOrder || "n/a"}\n\nConfirm final measurement, decking, ventilation, color, supplier availability, and install date before ordering.`;
  }

  return `Hi ${name}, thanks for checking the roof estimate for ${lead.address}. The quick range came back at ${lead.range}, and the next step is confirming roof basics before a final proposal.\n\nAny active leaks, insurance timing, or install deadline I should know about?${appointmentLine}${sharedDetails}`;
}

function copyLeadFollowup(id) {
  const lead = getLeads().find((item) => item.id === id);
  if (!lead) return;
  copyText(leadFollowupText(lead), lead.stage === "Won" ? "Handoff copied" : "Follow-up copied");
}

function leadInvoiceText(lead) {
  return `RoofQuote deposit request draft

Homeowner: ${lead.homeowner || "n/a"}
Address: ${lead.address || "n/a"}
Phone: ${lead.phone || "n/a"}
Email: ${lead.email || "n/a"}

Current range: ${lead.range || "n/a"}
Selected project value: ${money(lead.total || 0)}
Deposit request: ${money(lead.depositAmount)} (${lead.depositPercent || "n/a"}%)
Remaining balance: ${money(lead.balanceAmount)}
Invoice status: ${paymentDetails(lead.paymentStatus).label}

Payment note:
Please use this link to pay the ${lead.depositPercent || "project"}% project deposit:
[PASTE STRIPE INVOICE OR PAYMENT LINK]

Once the deposit is paid, we will confirm final measurements, decking, ventilation, material color, supplier availability, and install timing before production.

Material draft:
${lead.materialOrder || "n/a"}`;
}

function leadPaymentNudgeText(lead) {
  const name = firstName(lead.homeowner);
  const linkLine = "[PASTE STRIPE INVOICE OR PAYMENT LINK]";
  if (validPaymentStatus(lead.paymentStatus) === "Paid") {
    return `Hi ${name}, deposit received for ${lead.address}. Next I will confirm final measurements, material color, ventilation, supplier availability, and install timing before production.\n\nProject range: ${lead.range}\nDeposit received: ${money(lead.depositAmount)}\nRemaining balance: ${money(lead.balanceAmount)}`;
  }
  if (validPaymentStatus(lead.paymentStatus) === "Requested") {
    return `Hi ${name}, quick bump on the deposit request for ${lead.address}:\n\n${linkLine}\n\nOnce the ${money(lead.depositAmount)} deposit is paid, we will confirm final measurements, material color, supplier availability, and install timing.`;
  }
  return `Hi ${name}, here is the deposit request draft for ${lead.address}:\n\n${linkLine}\n\nDeposit: ${money(lead.depositAmount)} (${lead.depositPercent || "n/a"}%)\nRemaining balance: ${money(lead.balanceAmount)}\n\nOnce paid, we will confirm final measurements and production details before ordering materials.`;
}

function copyLeadInvoice(id) {
  const lead = getLeads().find((item) => item.id === id);
  if (!lead) return;
  copyText(leadInvoiceText(lead), "Invoice draft copied");
}

function copyLeadPaymentNudge(id) {
  const lead = getLeads().find((item) => item.id === id);
  if (!lead) return;
  copyText(leadPaymentNudgeText(lead), validPaymentStatus(lead.paymentStatus) === "Paid" ? "Paid handoff copied" : "Payment nudge copied");
}

function bookingLine() {
  return bookingUrl ? `\n\nYou can book the next step here: ${bookingUrl}` : "";
}

function followupText() {
  const estimate = currentEstimate || calculateEstimate();
  const bestOption = featuredOption(estimate);
  return `Hi ${estimate.input.homeowner || "there"}, thanks for checking your roof estimate for ${estimate.input.address || "your property"}.

Based on the details you shared, the likely project range is ${money(estimate.rangeLow)}-${money(estimate.rangeHigh)}. The option I would start with is ${bestOption.label}: ${bestOption.title} at about ${money(bestOption.total)}.

The next step is a quick measurement/inspection check so we can confirm decking, layers, ventilation, and timeline. Do you want the earliest appointment this week or a later slot?${bookingLine()}`;
}

function proposalSnapshotText() {
  const estimate = currentEstimate || calculateEstimate();
  const featured = featuredOption(estimate);
  const optionLines = estimate.options
    .map((option) => `${option.label}: ${option.title} - ${money(option.total)}`)
    .join("\n");

  return `RoofQuote proposal snapshot

Homeowner: ${estimate.input.homeowner || "n/a"}
Address: ${estimate.input.address || "n/a"}
Phone: ${estimate.input.phone || "n/a"}
Email: ${estimate.input.email || "n/a"}

Likely range: ${money(estimate.rangeLow)} - ${money(estimate.rangeHigh)}
Recommended option: ${featured.label}: ${featured.title} - ${money(featured.total)}

Scope:
${els.scopeText.textContent}

Pre-measurement report:
- ${qualificationText(estimate)}
- Measured area with waste: ${number(estimate.measuredArea)} sq ft (${number(estimate.squares)} squares)
- Waste factor: ${Math.round(estimate.waste * 100)}%
- Shingle bundles estimate: ${estimate.materialPlan.bundles}
- Underlayment: ${plural(estimate.materialPlan.underlaymentRolls, "roll")}
- Starter/ridge allowance: ${plural(estimate.materialPlan.starterRolls, "line")}
- Cap/nail boxes: ${plural(estimate.materialPlan.capNailsBoxes, "box", "boxes")}
- Accessory/checklist items: ${estimate.materialPlan.accessoryAllowance}

Material order draft:
${materialOrderText()}

Payment request draft:
${depositRequestText()}

Good / better / best:
${optionLines}

Deposit: ${money(estimate.depositAmount)}
Monthly estimate: ${money(estimate.monthlyAmount)}
Install window: ${estimate.installWindow}

${nextStepText(estimate)}${bookingLine()}`;
}

function emailProposal() {
  const estimate = currentEstimate || calculateEstimate();
  const subject = encodeURIComponent(`Roof estimate for ${estimate.input.address || "your property"}`);
  const body = encodeURIComponent(followupText());
  window.location.href = `mailto:${encodeURIComponent(estimate.input.email)}?subject=${subject}&body=${body}`;
}

function printProposal() {
  const estimate = currentEstimate || calculateEstimate();
  const proposalWindow = window.open("", "_blank", "noopener,noreferrer,width=900,height=900");
  if (!proposalWindow) {
    showToast("Popup blocked");
    return;
  }
  const rows = estimate.options
    .map(
      (option) => `
        <tr>
          <td><strong>${option.label}</strong><br>${option.title}</td>
          <td>${option.body}</td>
          <td>${money(option.total)}</td>
        </tr>
      `,
    )
    .join("");

  proposalWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Roof proposal</title>
        <style>
          body { font-family: Arial, sans-serif; color: #202328; padding: 34px; line-height: 1.45; }
          h1 { margin-bottom: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 22px; }
          td, th { border: 1px solid #d9dfdc; padding: 12px; vertical-align: top; }
          th { text-align: left; background: #f1f7f5; }
          .range { font-size: 26px; font-weight: 800; color: #14746f; }
          .snapshot { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-top: 20px; }
          .snapshot div { border: 1px solid #d9dfdc; padding: 10px; background: #fbfcf9; }
          .snapshot span { display: block; color: #66727c; font-size: 12px; font-weight: 700; text-transform: uppercase; }
          .snapshot strong { display: block; margin-top: 4px; }
          .material, .payment { margin-top: 22px; border: 1px solid #d9dfdc; padding: 14px; background: #fffdf8; }
          .payment { background: #f7fbff; }
          .material pre, .payment pre { white-space: pre-wrap; font-family: inherit; margin: 0; }
        </style>
      </head>
      <body>
        <p>RoofQuote Sprint</p>
        <h1>${estimate.input.address || "Roof proposal"}</h1>
        <p>${estimate.input.homeowner || "Homeowner"} · ${estimate.input.phone || ""} · ${estimate.input.email || ""}</p>
        <p class="range">${money(estimate.rangeLow)} - ${money(estimate.rangeHigh)}</p>
        <p>${els.scopeText.textContent}</p>
        <div class="snapshot">
          <div><span>Lead fit</span><strong>${leadFit(estimate)}</strong></div>
          <div><span>Measured area</span><strong>${number(estimate.measuredArea)} sq ft</strong></div>
          <div><span>Bundles</span><strong>${estimate.materialPlan.bundles}</strong></div>
          <div><span>Underlayment</span><strong>${plural(estimate.materialPlan.underlaymentRolls, "roll")}</strong></div>
        </div>
        <p>${qualificationText(estimate)}</p>
        <p>${nextStepText(estimate)}</p>
        <section class="material">
          <h2>Material order draft</h2>
          <pre>${materialOrderText()}</pre>
        </section>
        <section class="payment">
          <h2>Payment request draft</h2>
          <pre>${depositRequestText()}</pre>
        </section>
        <table>
          <thead><tr><th>Option</th><th>Scope</th><th>Total</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p><strong>Deposit:</strong> ${money(estimate.depositAmount)} · <strong>Install window:</strong> ${estimate.installWindow}</p>
      </body>
    </html>
  `);
  proposalWindow.document.close();
  proposalWindow.focus();
  proposalWindow.print();
}

function exportCsv() {
  const leads = getLeads();
  if (!leads.length) {
    showToast("No leads to export");
    return;
  }
  const headers = [
    "createdAt",
    "updatedAt",
    "stage",
    "paymentStatus",
    "nextAction",
    "actionStatus",
    "homeowner",
    "phone",
    "email",
    "address",
    "material",
    "area",
    "score",
    "total",
    "range",
    "depositPercent",
    "depositAmount",
    "balanceAmount",
    "materialOrder",
    "timeline",
  ];
  const rows = leads.map((lead) =>
    headers
      .map((header) => {
        const value = String(header === "actionStatus" ? actionStatusText(lead) : lead[header] ?? "");
        return `"${value.replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `roofquote-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast("CSV downloaded");
}

function clearLeads() {
  if (!getLeads().length) {
    showToast("No leads to clear");
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
  renderLeads();
  showToast("Leads cleared");
}

function resetDemo() {
  els.form.reset();
  els.form.elements.homeowner.value = "Jordan Miller";
  els.form.elements.phone.value = "(512) 555-0184";
  els.form.elements.email.value = "jordan@example.com";
  els.form.elements.address.value = "1842 Cedar Ridge Drive";
  els.form.elements.area.value = "2450";
  els.form.elements.stories.value = "2";
  els.form.elements.pitch.value = "standard";
  els.form.elements.complexity.value = "moderate";
  els.form.elements.tearOff.value = "1";
  els.form.elements.timeline.value = "month";
  els.form.elements.margin.value = "22";
  els.form.elements.deposit.value = "25";
  applyPricingParams(new URLSearchParams(window.location.search));
  renderEstimate();
  showToast("Demo reset");
}

function switchView(target) {
  if (!document.querySelector(`[data-view="${target}"]`)) return;
  document.querySelectorAll(".view").forEach((view) => {
    view.classList.toggle("is-active", view.dataset.view === target);
  });
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("is-active", tab.dataset.viewTarget === target);
  });
  window.location.hash = target;
}

function checkoutUrlChanged() {
  const value = els.checkoutUrlInput.value.trim();
  if (value) {
    localStorage.setItem(CHECKOUT_KEY, value);
    els.checkoutButton.href = value;
  } else {
    localStorage.removeItem(CHECKOUT_KEY);
    els.checkoutButton.href = defaultCheckoutUrl();
  }
}

function hydrateCheckout() {
  const saved = localStorage.getItem(CHECKOUT_KEY) || configValue("checkoutUrl");
  els.checkoutUrlInput.value = saved;
  if (saved) {
    els.checkoutButton.href = saved;
  } else {
    els.checkoutButton.href = defaultCheckoutUrl();
  }
}

function configValue(key) {
  return String(CONFIG[key] || "").trim();
}

function defaultCheckoutUrl() {
  return configValue("checkoutUrl") || "mailto:?subject=RoofQuote%20Sprint%20setup&body=I%20want%20the%20%24109%20instant%20roof%20quote%20setup.";
}

function initials(name) {
  const letters = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
  return (letters || "RQ").toUpperCase();
}

function setFieldFromParam(params, paramName, fieldName) {
  const value = params.get(paramName)?.trim();
  if (!value || !els.form.elements[fieldName]) return;
  const field = els.form.elements[fieldName];

  if (typeof RadioNodeList !== "undefined" && field instanceof RadioNodeList) {
    const option = Array.from(field).find((item) => item.value === value);
    if (option) option.checked = true;
    return;
  }

  const optionValues = field.tagName === "SELECT" ? Array.from(field.options).map((option) => option.value) : null;
  if (optionValues && !optionValues.includes(value)) return;
  field.value = value;
}

function applyPricingParams(params) {
  Object.entries(materialUnitParams).forEach(([paramName, materialKey]) => {
    const value = Number(params.get(paramName));
    if (Number.isFinite(value) && value > 0) {
      materialProfiles[materialKey].unit = value;
    }
  });

  Object.entries(demoFieldParams).forEach(([paramName, fieldName]) => {
    setFieldFromParam(params, paramName, fieldName);
  });
}

function applyDemoParams() {
  const params = new URLSearchParams(window.location.search);
  const company = params.get("company")?.trim();
  const city = params.get("city")?.trim();
  const phone = params.get("phone")?.trim();
  const checkout = params.get("checkout")?.trim();
  const booking = params.get("booking")?.trim() || configValue("bookingUrl");

  if (company) {
    els.brandName.textContent = `${company} Quote Desk`;
    els.brandMark.textContent = initials(company);
    document.title = `${company} Roof Quote Demo`;
  }

  if (city || phone) {
    els.brandSubtitle.textContent = [
      city ? `Instant roofing estimates for ${city}` : "Instant roofing estimates",
      phone,
    ]
      .filter(Boolean)
      .join(" · ");
  }

  if (checkout) {
    els.checkoutUrlInput.value = checkout;
    els.checkoutButton.href = checkout;
  }

  if (booking) {
    bookingUrl = booking;
  }

  applyPricingParams(params);
}

function hydrateScript() {
  els.salesScript.innerHTML = salesScript.map((line) => `<p>${line}</p>`).join("");
}

function wireEvents() {
  els.form.addEventListener("input", renderEstimate);
  els.form.addEventListener("change", renderEstimate);
  document.querySelector("#saveLeadButton").addEventListener("click", saveLead);
  document.querySelector("#resetButton").addEventListener("click", resetDemo);
  document.querySelector("#copyFollowupButton").addEventListener("click", () => copyText(followupText(), "Follow-up copied"));
  document.querySelector("#copySnapshotButton").addEventListener("click", () => copyText(proposalSnapshotText(), "Snapshot copied"));
  document.querySelector("#copyMaterialOrderButton").addEventListener("click", () => copyText(materialOrderText(), "Material order copied"));
  document.querySelector("#copyDepositRequestButton").addEventListener("click", () => copyText(depositRequestText(), "Payment request copied"));
  document.querySelector("#emailProposalButton").addEventListener("click", emailProposal);
  document.querySelector("#printProposalButton").addEventListener("click", printProposal);
  document.querySelector("#exportCsvButton").addEventListener("click", exportCsv);
  document.querySelector("#clearLeadsButton").addEventListener("click", clearLeads);
  document.querySelector("#copyPitchButton").addEventListener("click", () => copyText(pitchText, "Pitch copied"));
  document.querySelector("#copyOfferButton").addEventListener("click", () => copyText(pitchText, "Offer copied"));
  document.querySelector("#copyScriptButton").addEventListener("click", () => copyText(salesScript.map((line) => line.replace(/<[^>]*>/g, "")).join("\n"), "Script copied"));
  els.checkoutUrlInput.addEventListener("input", checkoutUrlChanged);

  document.querySelectorAll("[data-view-target]").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.viewTarget));
  });

  els.leadBoard.addEventListener("change", (event) => {
    const select = event.target.closest("[data-lead-stage]");
    if (select) {
      updateLeadStage(select.dataset.leadStage, select.value);
      return;
    }

    const paymentSelect = event.target.closest("[data-lead-payment]");
    if (paymentSelect) {
      updateLeadPaymentStatus(paymentSelect.dataset.leadPayment, paymentSelect.value);
    }
  });

  els.leadBoard.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy-lead]");
    if (copyButton) {
      copyLead(copyButton.dataset.copyLead);
      return;
    }

    const followupButton = event.target.closest("[data-copy-lead-followup]");
    if (followupButton) {
      copyLeadFollowup(followupButton.dataset.copyLeadFollowup);
      return;
    }

    const invoiceButton = event.target.closest("[data-copy-lead-invoice]");
    if (invoiceButton) {
      copyLeadInvoice(invoiceButton.dataset.copyLeadInvoice);
      return;
    }

    const paymentButton = event.target.closest("[data-copy-lead-payment]");
    if (paymentButton) {
      copyLeadPaymentNudge(paymentButton.dataset.copyLeadPayment);
      return;
    }

    const wonButton = event.target.closest("[data-mark-lead-won]");
    if (wonButton) {
      updateLeadStage(wonButton.dataset.markLeadWon, "Won");
      showToast("Lead marked won");
    }
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.replace("#", "");
    const active = document.querySelector(".view.is-active")?.dataset.view;
    if (hash && hash !== active) {
      switchView(hash);
    }
  });
}

function init() {
  hydrateCheckout();
  hydrateScript();
  applyDemoParams();
  wireEvents();
  renderEstimate();
  renderLeads();
  const hash = window.location.hash.replace("#", "");
  if (hash && document.querySelector(`[data-view="${hash}"]`)) {
    switchView(hash);
  }
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

init();
