const API = "/api/tempmail";

let currentEmail = localStorage.getItem("temp_mail") || "";
let loading = false;

if(currentEmail){
  emailBox.innerText = currentEmail;
  loadInbox(true);
}

setInterval(()=>{
  if(currentEmail && !loading){
    loadInbox(true);
  }
},5000);

function status(t){
  document.getElementById("status").innerText=t;
}

async function api(action,param=""){
  const r=await fetch(API+"?action="+action+param+"&_="+Date.now(),{
    cache:"no-store"
  });
  return await r.json();
}

async function createMail(){

  status("Creating...");

  try{

    const d=await api("create");

    currentEmail=d.data.email;

    localStorage.setItem("temp_mail",currentEmail);

    emailBox.innerText=currentEmail;

    status("Email Created ✅");

    loadInbox();

  }catch(e){

    status("Server/API Error ❌");

  }

}

function copyMail(){

  if(!currentEmail) return;

  navigator.clipboard.writeText(currentEmail);

  status("Copied ✅");

}

async function loadInbox(silent=false){

  if(loading) return;

  loading=true;

  try{

    const d=await api(
      "inbox",
      "&email="+encodeURIComponent(currentEmail)
    );

    const mails=d.data||[];

    inbox.innerHTML="";

    if(mails.length==0){

      if(!silent)
      status("No Mail Yet");

      loading=false;

      return;

    }

    mails.reverse();

    mails.forEach(m=>{

      inbox.innerHTML+=`
      <div class="item">

      <div class="subject">
      ${m.subject||"No Subject"}
      </div>

      <div class="small">
      From : ${m.from||""}
      </div>

      <div class="small">
      ${m.created_at||""}
      </div>

      <button onclick="readMail('${m.uuid}',this)">
      Open Mail
      </button>

      <div class="body" style="display:none"></div>

      </div>`;

    });

    if(!silent)
    status("Inbox Loaded ✅");

  }catch(e){

    if(!silent)
    status("Load Failed ❌");

  }

  loading=false;

}

async function readMail(id,btn){

  btn.innerText="Loading...";

  try{

    const d=await api(
      "read",
      "&uuid="+id
    );

    const body=btn.nextElementSibling;

    body.style.display="block";

    body.innerHTML=d.data.body||"No Body";

    btn.innerText="Opened ✅";

  }catch(e){

    btn.innerText="Failed";

  }

}

async function deleteMail(){

  if(!currentEmail) return;

  try{

    await api(
      "delete",
      "&email="+encodeURIComponent(currentEmail)
    );

    localStorage.removeItem("temp_mail");

    currentEmail="";

    emailBox.innerText="No email created";

    inbox.innerHTML="";

    status("Deleted ✅");

  }catch(e){

    status("Delete Failed ❌");

  }

}
