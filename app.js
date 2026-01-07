const form = document.getElementById("settings-form");
const linkList = document.getElementById("link-list");
const campaignTable = document.getElementById("campaign-table");
const summary = document.getElementById("summary");
const saveTemplateButton = document.getElementById("save-template");
const generateButton = document.getElementById("generate");
const clearButton = document.getElementById("clear");
const copyJsonButton = document.getElementById("copy-json");
const downloadCsvButton = document.getElementById("download-csv");

const TEMPLATE_KEY = "evadav-campaign-template";
let latestCampaigns = [];

const extractLinks = (text) =>
  text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

const slugDomain = (url) => {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch (error) {
    return "unknown";
  }
};

const formatName = (template, index, url) => {
  const date = new Date().toLocaleDateString("id-ID");
  return template
    .replace(/{{index}}/g, index + 1)
    .replace(/{{domain}}/g, slugDomain(url))
    .replace(/{{date}}/g, date);
};

const readSettings = () => {
  const data = new FormData(form);
  return Object.fromEntries(data.entries());
};

const saveTemplate = () => {
  const settings = readSettings();
  localStorage.setItem(TEMPLATE_KEY, JSON.stringify(settings));
  saveTemplateButton.textContent = "Template tersimpan ✓";
  setTimeout(() => {
    saveTemplateButton.textContent = "Simpan Template";
  }, 2000);
};

const loadTemplate = () => {
  const saved = localStorage.getItem(TEMPLATE_KEY);
  if (!saved) return;
  const data = JSON.parse(saved);
  Object.entries(data).forEach(([key, value]) => {
    const field = form.elements[key];
    if (field) field.value = value;
  });
};

const buildCampaigns = () => {
  const settings = readSettings();
  const links = extractLinks(linkList.value);
  const campaigns = links.map((url, index) => ({
    name: formatName(settings.campaignName, index, url),
    targetUrl: url,
    group: settings.group || "-",
    format: settings.format,
    pricing: settings.pricing,
    countries: settings.countries || "Semua",
    device: settings.device,
    cpm: settings.cpm || "-",
    frequency: settings.frequency || "-",
    postback: settings.postback || "-",
    dailyImpressions: settings.dailyImpressions || "0",
    totalImpressions: settings.totalImpressions || "0",
    notes: settings.notes || "",
  }));

  latestCampaigns = campaigns;
  renderCampaigns(campaigns);
};

const renderCampaigns = (campaigns) => {
  campaignTable.innerHTML = "";
  summary.textContent = campaigns.length
    ? `Berhasil menyiapkan ${campaigns.length} campaign.`
    : "Belum ada campaign yang dibuat.";

  campaigns.forEach((campaign, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${campaign.name}</td>
      <td>${campaign.targetUrl}</td>
      <td>${campaign.group}</td>
      <td>${campaign.format}</td>
      <td>${campaign.pricing}</td>
      <td>${campaign.countries}</td>
      <td>${campaign.cpm}</td>
    `;
    campaignTable.appendChild(row);
  });
};

const copyJson = async () => {
  if (!latestCampaigns.length) return;
  await navigator.clipboard.writeText(
    JSON.stringify(latestCampaigns, null, 2)
  );
  copyJsonButton.textContent = "JSON tersalin ✓";
  setTimeout(() => {
    copyJsonButton.textContent = "Copy JSON";
  }, 2000);
};

const downloadCsv = () => {
  if (!latestCampaigns.length) return;
  const headers = [
    "name",
    "targetUrl",
    "group",
    "format",
    "pricing",
    "countries",
    "device",
    "cpm",
    "frequency",
    "postback",
    "dailyImpressions",
    "totalImpressions",
    "notes",
  ];

  const rows = latestCampaigns.map((campaign) =>
    headers
      .map((header) =>
        `"${String(campaign[header]).replace(/"/g, "\"\"")}"`
      )
      .join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `evadav-campaigns-${Date.now()}.csv`;
  link.click();
};

const clearAll = () => {
  linkList.value = "";
  latestCampaigns = [];
  renderCampaigns([]);
};

saveTemplateButton.addEventListener("click", saveTemplate);
generateButton.addEventListener("click", buildCampaigns);
clearButton.addEventListener("click", clearAll);
copyJsonButton.addEventListener("click", copyJson);
downloadCsvButton.addEventListener("click", downloadCsv);

loadTemplate();
renderCampaigns([]);
