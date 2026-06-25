const API = "/api/tempmail";

let currentEmail = localStorage.getItem("temp_mail") || "";
let autoLoading = false;

if (currentEmail) {
  emailBox.innerText = currentEmail;
  loadInbox(true);
}

setInterval(() => {
  if (currentEmail && !autoLoading) {
    loadInbox(true);
  }
}, 5000);

function status(t) {
  document.getElementById("status").innerText = t;
}

async function api(action, params = "") {
  const res = await fetch(API + "?action=" + action + params + "&_=" + Date.now(), {
    cache: "no-store"
  });

  return await res.json();
}

function getOTP(text) {
  const match = String(text || "").match(/\b\d{4,8}\b/);
  return match ? match[0] : "";
}

async function createMail() {
  status("Creating mail...");
  inbox.innerHTML = "";

  try {
    const data = await api("create");
    const email = data?.data?.email || data?.email;

    if (email) {
      currentEmail = email;
      localStorage.setItem("temp_mail", email);
      emailBox.innerText = email;
      status("Email created ✅");
      loadInbox(true);
    } else {
      status("Create failed ❌");
      console.log(data);
    }
  } catch (e) {
    status("Server/API error ❌");
  }
}

function copyMail() {
  if (!currentEmail) return status("No email found");

  navigator.clipboard.writeText(currentEmail);
  status("Email copied ✅");
}

async function loadInbox(silent = false) {
  if (!currentEmail) return status("Create mail first");

  if (autoLoading) return;
  autoLoading = true;

  if (!silent) status("Checking inbox...");

  try {
    const data = await api("inbox", "&email=" + encodeURIComponent(currentEmail));
    const emails = data?.data || data || [];

    inbox.innerHTML = "";

    if (!Array.isArray(emails) || emails.length === 0) {
      if (!silent) status("No mail received yet");
      return;
    }

    if (!silent) status("Inbox loaded ✅");

    emails.slice().reverse().forEach(mail => {
      const uuid = mail.uuid || mail.id || "";
      const code = getOTP(mail.subject || "");

      const div = document.createElement("div");
      div.className = "item";

      div.innerHTML = `
        <div class="subject">${mail.subject || "No Subject"}</div>
        <div class="small">From: ${mail.from || mail.sender || ""}</div>
        <div class="small">Time: ${mail.created_at || mail.date || ""}</div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px;">
          ${
            code
              ? `<button style="background:#16a34a" onclick="copyOTP('${code}')">OTP : ${code}</button>`
              : `<button disabled>No OTP</button>`
          }

          <button onclick="readMail('${uuid}', this)">Open Mail</button>
        </div>

        <div class="body" style="display:none"></div>
      `;

      inbox.appendChild(div);
    });

  } catch (e) {
    if (!silent) status("Inbox load failed ❌");
  } finally {
    autoLoading = false;
  }
}

function copyOTP(code) {
  navigator.clipboard.writeText(code);
  status("OTP copied ✅");
}

async function readMail(uuid, btn) {
  btn.innerText = "Loading...";

  try {
    const data = await api("read", "&uuid=" + encodeURIComponent(uuid));
    const mail = data?.data || data;

    const body = btn.parentElement.nextElementSibling;
    body.style.display = "block";
    body.innerHTML = mail.body || mail.html || mail.text || "No body found";

    btn.innerText = "Opened ✅";
  } catch (e) {
    btn.innerText = "Failed ❌";
  }
}

async function deleteMail() {
  if (!currentEmail) return status("No email found");

  try {
    await api("delete", "&email=" + encodeURIComponent(currentEmail));

    localStorage.removeItem("temp_mail");
    currentEmail = "";
    emailBox.innerText = "No email created";
    inbox.innerHTML = "";
    status("Deleted ✅");

  } catch (e) {
    status("Delete failed ❌");
  }
}
