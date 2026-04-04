import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // For testing, allow any authenticated user; in production, check admin role
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await req.json();
    } catch (e) {
      return Response.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    const { memberId } = body;

    // Generate temporary password (12 chars: mix of uppercase, lowercase, numbers)
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const tempPassword = generateTempPassword();

    // Hash function (matches teamMemberAuth.js)
    const hashPassword = async (password) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hash = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
    };

    const passwordHash = await hashPassword(tempPassword);

    // Update member with new password and force change on next login
    await base44.entities.TeamMember.update(memberId, {
      password_hash: passwordHash,
      must_change_password: true,
    });

    return Response.json({
      success: true,
      tempPassword,
    });
  } catch (error) {
    console.error('Password reset error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});