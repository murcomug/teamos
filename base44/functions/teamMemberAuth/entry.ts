import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    // Only accept POST requests
    if (req.method !== 'POST') {
      return Response.json({ success: false, error: "Method not allowed" }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
    }

    const { action, email, password, memberId, newPassword } = body;

    if (action === 'login') {
      // Validation
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return Response.json({ success: false, error: "Valid email required" }, { status: 400 });
      }
      if (!password || typeof password !== 'string' || password.length < 1) {
        return Response.json({ success: false, error: "Password required" }, { status: 400 });
      }

      // Query for member
      const members = await base44.asServiceRole.entities.TeamMember.filter({ email: email.toLowerCase().trim() });
      if (!members || members.length === 0) {
        return Response.json({ success: false, error: "Invalid email or password" }, { status: 401 });
      }

      const member = members[0];

      if (!member.password_hash) {
        return Response.json({ success: false, error: "No password set. Contact your admin." }, { status: 401 });
      }

      // Check password expiry
      if (member.password_expires && new Date(member.password_expires) < new Date()) {
        return Response.json({ success: false, error: "Password expired. Contact your admin." }, { status: 401 });
      }

      // Verify password
      const inputHash = await hashPassword(password);
      if (inputHash !== member.password_hash) {
        return Response.json({ success: false, error: "Invalid email or password" }, { status: 401 });
      }

      // Return member data (safe, no sensitive fields)
      return Response.json(
        {
          success: true,
          member: {
            id: member.id,
            name: member.name || "",
            email: member.email,
            role: member.role || "operator",
            department: member.department || "",
            avatar_color: member.avatar_color || "#2dd4bf",
            must_change_password: member.must_change_password === true,
          }
        },
        { status: 200 }
      );
    }

    if (action === 'changePassword') {
      // Validation
      if (!memberId || typeof memberId !== 'string') {
        return Response.json({ success: false, error: "Member ID required" }, { status: 400 });
      }
      if (!newPassword || typeof newPassword !== 'string') {
        return Response.json({ success: false, error: "New password required" }, { status: 400 });
      }
      if (newPassword.length < 8) {
        return Response.json({ success: false, error: "Password must be at least 8 characters" }, { status: 400 });
      }

      const newHash = await hashPassword(newPassword);

      try {
        await base44.asServiceRole.entities.TeamMember.update(memberId, {
          password_hash: newHash,
          password_expires: null,
          must_change_password: false,
        });
        return Response.json({ success: true }, { status: 200 });
      } catch (updateError) {
        return Response.json({ success: false, error: "Failed to update password" }, { status: 500 });
      }
    }

    return Response.json({ success: false, error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Auth function error:", error);
    return Response.json(
      { success: false, error: "Server error. Please try again." },
      { status: 500 }
    );
  }
});