
const API_BASE_URL = "http://localhost:5000/api";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.message || "Request failed.");
  }

  return result;
}

export async function getIssues() {
  return request("/issues");
}

export async function createIssue(issue) {
  const result = await request("/issues", {
    method: "POST",
    body: JSON.stringify(issue),
  });

  return result.issue;
}

export async function supportIssue(issueId, affectedCount, priority) {
  const result = await request(
    `/issues/${encodeURIComponent(issueId)}/support`,
    {
      method: "PATCH",
      body: JSON.stringify({
        affected_count: affectedCount,
        priority,
      }),
    }
  );

  return result.issue;
}

export async function updateIssueStatus(issueId, status) {
  const result = await request(
    `/issues/${encodeURIComponent(issueId)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  );

  return result.issue;
}
