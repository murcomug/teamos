import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { data } = payload;

    if (!data?.email || !data?.id) {
      return Response.json({ skipped: "no email or id on team member" });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const expires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    // Store hashed password and expiry on the team member record
    await base44.asServiceRole.entities.TeamMember.update(data.id, {
      password_hash: passwordHash,
      password_expires: expires,
      must_change_password: true,
    });

    const resendKey = Deno.env.get("RESEND_API_KEY");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "TeamOS <onboarding@resend.dev>",
        to: [data.email],
        subject: `Welcome to TeamOS, ${data.name}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #e2e8f0; border-radius: 12px;">
            <h2 style="color: #2dd4bf;">Welcome to TeamOS 👋</h2>
            <p>Hi <strong>${data.name}</strong>,</p>
            <p>You've been added to <strong>TeamOS</strong>${data.department ? ` as a member of the <strong>${data.department}</strong> department` : ""}.</p>
            ${data.role ? `<p><strong>Your role:</strong> ${data.role}</p>` : ""}
            <p>Use the credentials below to log in. Your temporary password expires in <strong>3 days</strong>. You will be prompted to set a new password on first login.</p>
            <div style="background: #1a1a2e; border: 1px solid #2dd4bf33; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 4px 0;"><strong>Login page:</strong> <a href="${req.headers.get('origin') || ''}/member-login" style="color: #2dd4bf;">${req.headers.get('origin') || ''}/member-login</a></p>
              <p style="margin: 4px 0;"><strong>Email:</strong> ${data.email}</p>
              <p style="margin: 8px 0 4px;"><strong>Temporary Password:</strong></p>
              <p style="font-family: monospace; font-size: 22px; letter-spacing: 4px; color: #2dd4bf; margin: 8px 0;">${tempPassword}</p>
            </div>
            <p style="color: #94a3b8; font-size: 13px;">This password expires on ${new Date(expires).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.</p>
            <br/>
            <p style="color: #64748b;">Best regards,<br/>The TeamOS System</p>
          </div>
        `,
      }),
    });

    const result = await res.json();

    if (!res.ok) {
      return Response.json({ error: result }, { status: 500 });
    }

    return Response.json({ sent: true, to: data.email, id: result.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});