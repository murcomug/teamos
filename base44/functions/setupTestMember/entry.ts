import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import { createHash } from 'https://deno.land/std@0.220.0/crypto/mod.ts';

async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check if test member exists
    const existing = await base44.entities.TeamMember.filter({ email: 'test.member@example.com' });
    
    if (existing.length > 0) {
      return Response.json({ 
        success: true, 
        message: 'Test member already exists',
        member: existing[0]
      });
    }

    // Create test member
    const passwordHash = await hashPassword('MySecurePassword123');
    const testMember = await base44.entities.TeamMember.create({
      name: 'Test Member',
      email: 'test.member@example.com',
      role: 'operator',
      department: 'IT',
      avatar_color: '#2dd4bf',
      password_hash: passwordHash,
      must_change_password: false,
      permissions: []
    });

    return Response.json({ 
      success: true, 
      message: 'Test member created',
      member: testMember
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});