const API = "/api/tempmail";

let currentEmail = localStorage.getItem("temp_mail") || "";
let inboxLoading = false;
let lastMailIds = [];

if (currentEmail) {
  emailBox.innerText = currentEmail;
  loadInbox(true);
}

// Auto Refresh (5 seconds)
setInterval(() => {
  if (currentEmail && !inboxLoading) {
    loadInbox(true);
  }
}, 5000);

function status(text) {
  document.getElementById("status").innerText = text;
}

async function api(action, params = "") {
  const res = await fetch(`${API}?action=${action}${params}`, {
    cache: "no-store"
  });

  if (!res.ok) throw new Error("API Error");

  return await res.json();
}

async function createMail() {
  status("Creating email...");
  inbox.innerHTML = "";

  try {
    const data = await api("create");

    const email = data?.data?.email || data?.email;

    if (!email) {
      status("Create failed ❌");
      return;
    }

    currentEmail = email;

    localStorage.setItem("temp_mail", email);

    emailBox.innerText = email;

    lastMailIds = [];

    status("Email created ✅");

    loadInbox(true);

  } catch (e) {
    console.error(e);
    status("Server/API error ❌");
  }
}

function copyMail() {

  if (!currentEmail) {
    status("No email found");
    return;
  }

  navigator.clipboard.writeText(currentEmail);

  status("Email copied ✅");
}

async function loadInbox(silent = false) {

  if (inboxLoading) return;

  inboxLoading = true;

  try {

    if (!currentEmail) {
      if (!silent) status("Create email first");
      return;
    }

    if (!silent) status("Checking inbox...");

    const data = await api(
      "inbox",
      "&email=" + encodeURIComponent(currentEmail)
    );

    let emails = data?.data || data || [];

    if (!Array.isArray(emails))
      emails = [];

    emails.reverse();

    const ids = emails.map(m => m.uuid || m.id);

    if (
      lastMailIds.length &&
      JSON.stringify(ids) !== JSON.stringify(lastMailIds)
    ) {

      if (navigator.vibrate)
        navigator.vibrate(150);

      status("📩 New Mail Received");
    }

    lastMailIds = ids;

    inbox.innerHTML = "";

    if (emails.length === 0) {
      if (!silent)
        status("No mail received");
      return;
    }

    if (!silent)
      status("Inbox updated ✅");

    emails.forEach(mail => {

      const uuid = mail.uuid || mail.id || "";

      const div = document.createElement("div");

      div.className = "item";

      div.innerHTML = `
        <div class="subject">${mail.subject || "No Subject"}</div>

        <div class="small">
        From : ${mail.from || mail.sender || ""}
        </div>

        <div class="small">
        ${mail.created_at || mail.date || ""}
        </div>

        <button onclick="readMail('${uuid}',this)">
        Open Mail
        </button>

        <div class="body" style="display:none"></div>
      `;

      inbox.appendChild(div);

    });

  } catch (e) {

    console.error(e);

    if (!silent)
      status("Inbox load failed ❌");

  } finally {

    inboxLoading = false;

  }

}

async function readMail(uuid, btn) {

  btn.innerText = "Loading...";

  try {

    const data = await api(
      "read",
      "&uuid=" + encodeURIComponent(uuid)
    );

    const mail = data?.data || data;

    const body = btn.nextElementSibling;

    body.style.display = "block";

    body.innerHTML =
      mail.html ||
      mail.body ||
      mail.text ||
      "No content";

    btn.innerText = "Opened ✅";

  } catch (e) {

    console.error(e);

    btn.innerText = "Failed ❌";

  }

}

async function deleteMail() {

  if (!currentEmail) {
    status("No email");
    return;
  }

  if (!confirm("Delete this email?"))
    return;

  try {

    await api(
      "delete",
      "&email=" + encodeURIComponent(currentEmail)
    );

    localStorage.removeItem("temp_mail");

    currentEmail = "";

    lastMailIds = [];

    emailBox.innerText = "No email created";

    inbox.innerHTML = "";

    status("Deleted ✅");

  } catch (e) {

    console.error(e);

    status("Delete failed ❌");

  }

}
