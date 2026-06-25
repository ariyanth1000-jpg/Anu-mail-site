const API = "/api/tempmail";

let currentEmail = localStorage.getItem("temp_mail") || "";
let inboxLoading = false;
let autoTimer = null;

const emailBox = document.getElementById("emailBox");
const inbox = document.getElementById("inbox");
const statusBox = document.getElementById("status");

if(currentEmail){
  emailBox.innerText = currentEmail;
  loadInbox(true);
}

startAutoRefresh();

function status(text){
  statusBox.innerText = text;
}

function startAutoRefresh(){
  if(autoTimer) clearInterval(autoTimer);

  autoTimer = setInterval(()=>{
    if(currentEmail && !inboxLoading){
      loadInbox(true);
    }
  }, 5000);
}

async function api(action, params = ""){
  const url = API + "?action=" + action + params + "&t=" + Date.now();

  const res = await fetch(url, {
    method:"GET",
    cache:"no-store"
  });

  const text = await res.text();

  let data = {};
  try{
    data = text ? JSON.parse(text) : {};
  }catch(e){
    throw new Error("Invalid JSON");
  }

  if(!res.ok){
    throw new Error(data.error || "API Error");
  }

  return data;
}

async function createMail(){
  status("Creating mail...");
  inbox.innerHTML = "";

  try{
    const data = await api("create");

    const email =
      data?.data?.email ||
      data?.email ||
      data?.address ||
      "";

    if(!email){
      status("Create failed ❌");
      console.log(data);
      return;
    }

    currentEmail = email;
    localStorage.setItem("temp_mail", email);
    emailBox.innerText = email;

    status("Email created ✅");
    loadInbox(true);

  }catch(e){
    console.error(e);
    status("Server/API error ❌");
  }
}

function copyMail(){
  if(!currentEmail){
    status("No email found");
    return;
  }

  navigator.clipboard.writeText(currentEmail);
  status("Email copied ✅");
}

async function loadInbox(silent = false){
  if(inboxLoading) return;
  inboxLoading = true;

  try{
    if(!currentEmail){
      if(!silent) status("Create mail first");
      return;
    }

    if(!silent) status("Checking inbox...");

    const data = await api(
      "inbox",
      "&email=" + encodeURIComponent(currentEmail)
    );

    let emails =
      data?.data ||
      data?.emails ||
      data?.messages ||
      data ||
      [];

    if(!Array.isArray(emails)){
      emails = [];
    }

    emails = emails.slice().reverse();

    inbox.innerHTML = "";

    if(emails.length === 0){
      if(!silent) status("No mail received yet");
      return;
    }

    status("Inbox loaded ✅");

    emails.forEach(mail=>{
      const uuid = mail.uuid || mail.id || mail.email_id || "";

      const div = document.createElement("div");
      div.className = "item";

      div.innerHTML = `
        <div class="subject">${mail.subject || "No Subject"}</div>
        <div class="small">From: ${mail.from || mail.sender || mail.from_email || ""}</div>
        <div class="small">Time: ${mail.created_at || mail.date || mail.createdAt || ""}</div>
        <button onclick="readMail('${uuid}', this)">Open Mail</button>
        <div class="body"></div>
      `;

      inbox.appendChild(div);
    });

  }catch(e){
    console.error(e);
    if(!silent) status("Inbox load failed ❌");
  }finally{
    inboxLoading = false;
  }
}

async function readMail(uuid, btn){
  if(!uuid){
    btn.innerText = "No ID";
    return;
  }

  btn.innerText = "Loading...";

  try{
    const data = await api(
      "read",
      "&uuid=" + encodeURIComponent(uuid)
    );

    const mail = data?.data || data;

    const body = btn.nextElementSibling;
    body.style.display = "block";
    body.innerHTML =
      mail.body ||
      mail.html ||
      mail.text ||
      mail.content ||
      "No body found";

    btn.innerText = "Opened ✅";

  }catch(e){
    console.error(e);
    btn.innerText = "Failed ❌";
  }
}

async function deleteMail(){
  if(!currentEmail){
    status("No email found");
    return;
  }

  try{
    await api(
      "delete",
      "&email=" + encodeURIComponent(currentEmail)
    );

    localStorage.removeItem("temp_mail");
    currentEmail = "";

    emailBox.innerText = "No email created";
    inbox.innerHTML = "";
    status("Deleted ✅");

  }catch(e){
    console.error(e);
    status("Delete failed ❌");
  }
}
