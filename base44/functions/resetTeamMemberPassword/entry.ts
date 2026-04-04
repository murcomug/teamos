import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { memberId } = await req.json();

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

    // Simple hash function (in production, use bcrypt or similar)
    const hashPassword = async (password) => {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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
      memberId,
      message: 'Password reset successful. Share the temporary password with the team member.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});