const API = "/api/tempmail";
let currentEmail = localStorage.getItem("temp_mail") || "";
let mailIds = new Set();

if (currentEmail) {
  emailBox.innerText = currentEmail;
  loadInbox();
}

setInterval(() => {
  if (currentEmail) {
    loadInbox();
  }
}, 3000);

function status(t) {
  document.getElementById("status").innerText = t;
}

async function api(action, params = "") {
  const res = await fetch(API + "?action=" + action + params + "&_=" + Date.now());
  return await res.json();
}

function getOTP(text) {
  const match = String(text || "").match(/\b\d{4,8}\b/);
  return match ? match[0] : "";
}

function copyOTP(code) {
  navigator.clipboard.writeText(code);
  status("OTP copied ✅");
}

async function createMail() {
  status("Creating mail...");
  inbox.innerHTML = "";
  mailIds.clear();

  try {
    const data = await api("create");
    const email = data?.data?.email || data?.email;

    if (email) {
      currentEmail = email;
      localStorage.setItem("temp_mail", email);
      emailBox.innerText = email;
      status("Email created ✅");
      loadInbox();
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

async function loadInbox() {
  if (!currentEmail) return status("Create mail first");

  try {
    const data = await api("inbox", "&email=" + encodeURIComponent(currentEmail));
    const emails = data?.data || data || [];

    if (!Array.isArray(emails) || emails.length === 0) {
      if (mailIds.size === 0) status("No mail received yet");
      return;
    }

    let newCount = 0;

    emails.slice().reverse().forEach(mail => {
      const uuid = mail.uuid || mail.id;
      if (!uuid || mailIds.has(uuid)) return;

      mailIds.add(uuid);
      newCount++;

      const otp = getOTP(mail.subject || "");

      const div = document.createElement("div");
      div.className = "item";
      div.id = "mail_" + uuid;

      div.innerHTML = `
        <div class="subject">${mail.subject || "No Subject"}</div>
        <div class="small">From: ${mail.from || mail.sender || ""}</div>
        <div class="small">Time: ${mail.created_at || mail.date || ""}</div>

        <div class="grid">
          ${
            otp
              ? `<button onclick="copyOTP('${otp}')" style="background:#16a34a">OTP: ${otp}</button>`
              : `<button disabled style="background:#334155">No OTP</button>`
          }
          <button onclick="readMail('${uuid}', this)">Open Mail</button>
        </div>

        <div class="body" style="display:none"></div>
      `;

      inbox.prepend(div);
    });

    if (newCount > 0) {
      status("Inbox updated ✅");
    }

  } catch (e) {
    status("Inbox load failed ❌");
  }
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
    mailIds.clear();

    emailBox.innerText = "No email created";
    inbox.innerHTML = "";
    status("Deleted ✅");

  } catch (e) {
    status("Delete failed ❌");
  }
}
