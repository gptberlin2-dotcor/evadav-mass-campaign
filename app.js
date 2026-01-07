const form = document.getElementById("settings-form");
const linkList = document.getElementById("link-list");
const campaignTable = document.getElementById("campaign-table");
const summary = document.getElementById("summary");
const saveTemplateButton = document.getElementById("save-template");
const generateButton = document.getElementById("generate");
const clearButton = document.getElementById("clear");
const copyJsonButton = document.getElementById("copy-json");
const downloadCsvButton = document.getElementById("download-csv");
const apiUrlInput = document.getElementById("api-url");
const apiKeyInput = document.getElementById("api-key");
const apiEndpointInput = document.getElementById("api-endpoint");
const apiDryRunSelect = document.getElementById("api-dry-run");
const apiModeSelect = document.getElementById("api-mode");
const sendApiButton = document.getElementById("send-api");
const testConnectionButton = document.getElementById("test-connection");
const apiStatus = document.getElementById("api-status");
const authUrlInput = document.getElementById("auth-url");
const authEndpointInput = document.getElementById("auth-endpoint");
const authEmailInput = document.getElementById("auth-email");
const authPasswordInput = document.getElementById("auth-password");
const authTokenKeyInput = document.getElementById("auth-token-key");
const connectAccountButton = document.getElementById("connect-account");
const authStatus = document.getElementById("auth-status");

const TEMPLATE_KEY = "evadav-campaign-template";
let latestCampaigns = [];
let isBulkVerified = false;

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
  resetBulkVerification();
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
  resetBulkVerification();
};

const resolveApiUrl = () => {
  const base = apiUrlInput.value.trim().replace(/\/$/, "");
  const endpoint = apiEndpointInput.value.trim().replace(/^\//, "");
  return base && endpoint ? `${base}/${endpoint}` : "";
};

const updateApiStatus = (message, isError = false) => {
  apiStatus.textContent = message;
  apiStatus.style.color = isError ? "#b91c1c" : "var(--muted)";
};

const setBulkVerified = (value) => {
  isBulkVerified = value;
  sendApiButton.disabled = !value;
  if (!value) {
    updateApiStatus("Uji koneksi bulk terlebih dahulu sebelum mengirim.");
  }
};

const resetBulkVerification = () => {
  setBulkVerified(false);
};

const testBulkConnection = async () => {
  if (!latestCampaigns.length) {
    updateApiStatus("Buat minimal 1 campaign untuk uji koneksi.", true);
    return;
  }

  const apiUrl = resolveApiUrl();
  const apiKey = apiKeyInput.value.trim();

  if (!apiUrl || !apiKey) {
    updateApiStatus("Lengkapi API Base URL dan API Key terlebih dahulu.", true);
    return;
  }

  testConnectionButton.disabled = true;
  testConnectionButton.textContent = "Menguji...";
  updateApiStatus("Menguji koneksi bulk campaign...");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
  const dryRun = apiDryRunSelect.value === "true";

  try {
    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        campaigns: latestCampaigns.slice(0, 1),
        dryRun,
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    setBulkVerified(true);
    updateApiStatus("Koneksi bulk terverifikasi. Siap kirim campaign.");
  } catch (error) {
    setBulkVerified(false);
    updateApiStatus(
      `Uji koneksi gagal: ${error.message || "unknown error"}`,
      true
    );
  } finally {
    testConnectionButton.disabled = false;
    testConnectionButton.textContent = "Uji Koneksi Bulk";
  }
};

const resolveAuthUrl = () => {
  const base = authUrlInput.value.trim().replace(/\/$/, "");
  const endpoint = authEndpointInput.value.trim().replace(/^\//, "");
  return base && endpoint ? `${base}/${endpoint}` : "";
};

const updateAuthStatus = (message, isError = false) => {
  authStatus.textContent = message;
  authStatus.style.color = isError ? "#b91c1c" : "var(--muted)";
};

const connectAccount = async () => {
  const authUrl = resolveAuthUrl();
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;
  const tokenKey = authTokenKeyInput.value.trim() || "token";

  if (!authUrl || !email || !password) {
    updateAuthStatus(
      "Lengkapi URL auth, email, dan password terlebih dahulu.",
      true
    );
    return;
  }

  connectAccountButton.disabled = true;
  connectAccountButton.textContent = "Menghubungkan...";
  updateAuthStatus("Menghubungkan akun adviser...");

  try {
    const response = await fetch(authUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    const token =
      data[tokenKey] ||
      data.access_token ||
      (data.data && data.data[tokenKey]);

    if (!token) {
      throw new Error("Token tidak ditemukan pada respons.");
    }

    apiKeyInput.value = token;
    updateAuthStatus("Berhasil terhubung. Token tersimpan ke API Key.");
    resetBulkVerification();
    if (latestCampaigns.length && resolveApiUrl()) {
      await testBulkConnection();
    }
  } catch (error) {
    updateAuthStatus(
      `Koneksi gagal: ${error.message || "unknown error"}`,
      true
    );
  } finally {
    connectAccountButton.disabled = false;
    connectAccountButton.textContent = "Hubungkan Akun";
  }
};

const sendToApi = async () => {
  if (!latestCampaigns.length) {
    updateApiStatus("Belum ada campaign untuk dikirim.", true);
    return;
  }
  if (!isBulkVerified) {
    updateApiStatus(
      "Koneksi bulk belum diverifikasi. Klik Uji Koneksi Bulk terlebih dahulu.",
      true
    );
    return;
  }

  const apiUrl = resolveApiUrl();
  const apiKey = apiKeyInput.value.trim();

  if (!apiUrl || !apiKey) {
    updateApiStatus("Lengkapi API Base URL dan API Key terlebih dahulu.", true);
    return;
  }

  sendApiButton.disabled = true;
  sendApiButton.textContent = "Mengirim...";
  updateApiStatus("Mengirim campaign ke EvaDav API...");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  try {
    if (apiModeSelect.value === "bulk") {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers,
        body: JSON.stringify({ campaigns: latestCampaigns }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      updateApiStatus("Sukses mengirim campaign secara bulk.");
    } else {
      const results = await Promise.allSettled(
        latestCampaigns.map((campaign) =>
          fetch(apiUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(campaign),
          })
        )
      );
      const successCount = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      updateApiStatus(
        `Sukses mengirim ${successCount} dari ${latestCampaigns.length} campaign.`
      );
    }
  } catch (error) {
    updateApiStatus(
      `Pengiriman gagal: ${error.message || "unknown error"}`,
      true
    );
  } finally {
    sendApiButton.disabled = false;
    sendApiButton.textContent = "Kirim Campaign ke API";
  }
};

saveTemplateButton.addEventListener("click", saveTemplate);
generateButton.addEventListener("click", buildCampaigns);
clearButton.addEventListener("click", clearAll);
copyJsonButton.addEventListener("click", copyJson);
downloadCsvButton.addEventListener("click", downloadCsv);
sendApiButton.addEventListener("click", sendToApi);
testConnectionButton.addEventListener("click", testBulkConnection);
connectAccountButton.addEventListener("click", connectAccount);

[apiUrlInput, apiKeyInput, apiEndpointInput, apiDryRunSelect].forEach(
  (element) => {
    element.addEventListener("input", resetBulkVerification);
    element.addEventListener("change", resetBulkVerification);
  }
);

loadTemplate();
renderCampaigns([]);
resetBulkVerification();

loadTemplate();
renderCampaigns([]);
