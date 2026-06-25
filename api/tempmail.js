const BASE = "https://api.tempmail.co/v1";

export default async function handler(req, res) {
  const { action, email, uuid } = req.query;

  let path = "";
  let method = "GET";

  if (action === "create") {
    path = "/addresses";
    method = "POST";
  } else if (action === "inbox") {
    path = "/addresses/" + encodeURIComponent(email || "") + "/emails";
  } else if (action === "read") {
    path = "/emails/" + encodeURIComponent(uuid || "");
  } else if (action === "delete") {
    path = "/addresses/" + encodeURIComponent(email || "");
    method = "DELETE";
  } else {
    return res.status(400).json({ error: "Invalid action" });
  }

  try {
    const apiRes = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: "Bearer " + process.env.TEMPMAIL_TOKEN,
        Accept: "application/json"
      }
    });

    const text = await apiRes.text();

    res.status(apiRes.status);
    res.setHeader("Content-Type", "application/json");
    res.send(text || "{}");

  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
}
