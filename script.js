const API = "/api/tempmail";

let currentEmail = localStorage.getItem("temp_mail") || "";
let loading = false;
let openedMailId = "";

if (currentEmail) {
  emailBox.innerText = currentEmail;
  loadInbox();
}

setInterval(() => {
  if (currentEmail && !loading && !openedMailId) {
    loadInbox();
  }
}, 10000);

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

function copyOTP(code) {
  navigator.clipboard.writeText(code);
  status("OTP copied ✅");
}

async function createMail() {
  openedMailId = "";
  loading = true;
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
      loading = false;
      loadInbox();
    } else {
      status("Create failed ❌");
    }
  } catch (e) {
    status("Server/API error ❌");
  }

  loading = false;
}

function copyMail() {
  if (!currentEmail) return status("No email found");
  navigator.clipboard.writeText(currentEmail);
  status("Email copied ✅");
}

async function loadInbox() {
  if (!currentEmail) return status("Create mail first");
  if (loading || openedMailId) return;

  loading = true;

  try {
    const data = await api("inbox", "&email=" + encodeURIComponent(currentEmail));
    const emails = data?.data || data || [];

    inbox.innerHTML = "";

    if (!Array.isArray(emails) || emails.length === 0) {
      status("No mail received yet");
      loading = false;
      return;
    }

    status("Inbox loaded ✅");

    emails.forEach(mail => {
      const uuid = mail.uuid || mail.id || "";
      const otp = getOTP(mail.subject || "");

      const div = document.createElement("div");
      div.className = "item";

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

      inbox.appendChild(div);
    });

  } catch (e) {
    status("Inbox load failed ❌");
  }

  loading = false;
}

async function readMail(uuid, btn) {
  const body = btn.parentElement.nextElementSibling;

  if (openedMailId === uuid && body.style.display === "block") {
    openedMailId = "";
    body.style.display = "none";
    btn.innerText = "Open Mail";
    status("Auto refresh resumed ✅");
    loadInbox();
    return;
  }

  openedMailId = uuid;
  btn.innerText = "Loading...";
  status("Auto refresh paused while mail is open");

  try {
    const data = await api("read", "&uuid=" + encodeURIComponent(uuid));
    const mail = data?.data || data;

    body.style.display = "block";
    body.innerHTML = mail.body || mail.html || mail.text || "No body found";

    btn.innerText = "Close Mail";
  } catch (e) {
    openedMailId = "";
    btn.innerText = "Failed ❌";
    status("Mail open failed ❌");
  }
}

async function deleteMail() {
  if (!currentEmail) return status("No email found");

  openedMailId = "";
  loading = true;

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

  loading = false;
}
