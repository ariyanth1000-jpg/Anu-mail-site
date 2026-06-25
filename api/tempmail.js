const BASE = "https://api.tempmail.co/v1";

export default async function handler(req, res) {
  const { action, email, uuid } = req.query;

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (!process.env.TEMPMAIL_TOKEN) {
    return res.status(500).json({
      error: "TEMPMAIL_TOKEN missing"
    });
  }

  let path = "";
  let method = "GET";

  if (action === "create") {
    path = "/addresses";
    method = "POST";
  } else if (action === "inbox") {
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    path = "/addresses/" + encodeURIComponent(email) + "/emails";
  } else if (action === "read") {
    if (!uuid) {
      return res.status(400).json({ error: "UUID required" });
    }
    path = "/emails/" + encodeURIComponent(uuid);
  } else if (action === "delete") {
    if (!email) {
      return res.status(400).json({ error: "Email required" });
    }
    path = "/addresses/" + encodeURIComponent(email);
    method = "DELETE";
  } else {
    return res.status(400).json({
      error: "Invalid action"
    });
  }

  try {
    const apiRes = await fetch(BASE + path, {
      method,
      headers: {
        Authorization: "Bearer " + process.env.TEMPMAIL_TOKEN,
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const text = await apiRes.text();

    res.status(apiRes.status);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");

    return res.send(text || "{}");

  } catch (err) {
    return res.status(500).json({
      error: "Server error"
    });
  }
}
