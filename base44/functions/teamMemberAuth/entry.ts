import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, email, password, memberId, newPassword } = await req.json();

    if (action === 'login') {
      if (!email || !password) {
        return Response.json({ success: false, error: "Email and password required" });
      }

      const members = await base44.asServiceRole.entities.TeamMember.filter({ email });
      const member = members[0];

      if (!member) {
        return Response.json({ success: false, error: "Invalid email or password" });
      }

      if (!member.password_hash) {
        return Response.json({ success: false, error: "No password set. Contact your admin." });
      }

      // Check expiry
      if (member.password_expires && new Date(member.password_expires) < new Date()) {
        return Response.json({ success: false, error: "Your temporary password has expired. Please contact your admin." });
      }

      const inputHash = await hashPassword(password);
      if (inputHash !== member.password_hash) {
        return Response.json({ success: false, error: "Invalid email or password" });
      }

      // Return member data (without sensitive fields)
      return Response.json({
        success: true,
        member: {
          id: member.id,
          name: member.name,
          email: member.email,
          role: member.role,
          department: member.department,
          avatar_color: member.avatar_color,
          must_change_password: member.must_change_password || false,
        }
      });
    }

    if (action === 'changePassword') {
      if (!memberId || !newPassword) {
        return Response.json({ success: false, error: "Member ID and new password required" });
      }

      if (newPassword.length < 8) {
        return Response.json({ success: false, error: "Password must be at least 8 characters" });
      }

      const newHash = await hashPassword(newPassword);

      await base44.asServiceRole.entities.TeamMember.update(memberId, {
        password_hash: newHash,
        password_expires: null,
        must_change_password: false,
      });

      return Response.json({ success: true });
    }

    return Response.json({ success: false, error: "Unknown action" });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});