const API="/api/tempmail";

let currentEmail=localStorage.getItem("temp_mail")||"";
let loading=false;
let lastCount=0;

if(currentEmail){
  emailBox.innerText=currentEmail;
  loadInbox(true);
}

setInterval(()=>{
  if(currentEmail&&!loading) loadInbox(true);
},5000);

function status(t){
  statusBox.innerText=t;
}

function showLoader(v){
  loader.style.display=v?"block":"none";
}

async function api(action,param=""){
  const r=await fetch(API+"?action="+action+param+"&_="+Date.now(),{
    cache:"no-store"
  });
  const d=await r.json();
  if(!r.ok) throw new Error(d.error||"API Error");
  return d;
}

function findOTP(text){
  const m=String(text||"").match(/\b\d{4,8}\b/);
  return m?m[0]:"";
}

async function createMail(){
  status("Creating...");
  showLoader(true);
  inbox.innerHTML="";

  try{
    const d=await api("create");
    const email=d?.data?.email||d?.email;

    if(!email){
      status("Create failed ❌");
      return;
    }

    currentEmail=email;
    lastCount=0;
    localStorage.setItem("temp_mail",email);
    emailBox.innerText=email;
    status("Email Created ✅");
    loadInbox(true);

  }catch(e){
    status("Server/API Error ❌");
  }finally{
    showLoader(false);
  }
}

function copyMail(){
  if(!currentEmail) return status("No email found");
  navigator.clipboard.writeText(currentEmail);
  status("Email copied ✅");
}

async function loadInbox(silent=false){
  if(loading) return;
  loading=true;
  if(!silent) showLoader(true);

  try{
    if(!currentEmail){
      if(!silent) status("Create mail first");
      return;
    }

    const d=await api("inbox","&email="+encodeURIComponent(currentEmail));
    let mails=d.data||[];

    if(!Array.isArray(mails)) mails=[];

    mailCount.innerText="Inbox: "+mails.length;

    if(mails.length>lastCount&&lastCount!==0){
      status("New Mail Received 🔔");
      if(navigator.vibrate) navigator.vibrate(200);
    }

    lastCount=mails.length;
    inbox.innerHTML="";

    if(mails.length===0){
      if(!silent) status("No Mail Yet");
      return;
    }

    mails.reverse();

    mails.forEach(m=>{
      const code=findOTP(m.subject||"");
      inbox.innerHTML+=`
      <div class="item">
        <div class="subject">${m.subject||"No Subject"}</div>
        <div class="small">From : ${m.from||""}</div>
        <div class="small">${m.created_at||""}</div>

        <div class="mailBtns">
          ${
            code
            ? `<button class="copyBtn" onclick="copyCode('${code}')">OTP: ${code}</button>`
            : `<button class="copyBtn" disabled>No OTP</button>`
          }
          <button onclick="readMail('${m.uuid}',this)">Open Mail</button>
        </div>

        <div class="body"></div>
      </div>`;
    });

    if(!silent) status("Inbox Loaded ✅");

  }catch(e){
    if(!silent) status("Load Failed ❌");
  }finally{
    loading=false;
    showLoader(false);
  }
}

function copyCode(code){
  navigator.clipboard.writeText(code);
  status("OTP copied ✅");
}

async function readMail(id,btn){
  btn.innerText="Loading...";

  try{
    const d=await api("read","&uuid="+encodeURIComponent(id));
    const mail=d.data||d;
    const content=mail.body||mail.html||mail.text||"No Body";

    const body=btn.parentElement.nextElementSibling;
    body.style.display="block";
    body.innerHTML=content;
    btn.innerText="Opened ✅";

  }catch(e){
    btn.innerText="Failed";
  }
}

async function deleteMail(){
  if(!currentEmail) return status("No email found");
  if(!confirm("Delete this email?")) return;

  showLoader(true);

  try{
    await api("delete","&email="+encodeURIComponent(currentEmail));

    localStorage.removeItem("temp_mail");
    currentEmail="";
    lastCount=0;

    emailBox.innerText="No email created";
    inbox.innerHTML="";
    mailCount.innerText="Inbox: 0";
    status("Deleted ✅");

  }catch(e){
    status("Delete Failed ❌");
  }finally{
    showLoader(false);
  }
}
