'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireSession, hashPassword } from '@/lib/auth';
import { canManageTenants, canManageUsers } from '@/lib/rbac';
import { audit } from '@/lib/audit';
import { ROLES, type Role } from '@/lib/constants';

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function createTenantAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageTenants(session)) throw new Error('Not permitted.');

  const name = String(formData.get('name') ?? '').trim();
  if (!name) throw new Error('Firm name is required.');
  let slug = slugify(name);
  const clash = await db.tenant.findUnique({ where: { slug } });
  if (clash) slug = `${slug}-${Math.floor(Math.random() * 9000 + 1000)}`;

  const tenant = await db.tenant.create({
    data: {
      name,
      slug,
      status: 'ONBOARDING',
      contactName: String(formData.get('contactName') ?? '') || null,
      contactEmail: String(formData.get('contactEmail') ?? '') || null,
      phone: String(formData.get('phone') ?? '') || null,
      state: String(formData.get('state') ?? '') || null,
      perCaseRate: Number(formData.get('perCaseRate') ?? 250) || 250,
      notes: String(formData.get('notes') ?? '') || null,
    },
  });

  // optional initial firm-admin account
  const adminEmail = String(formData.get('adminEmail') ?? '').trim().toLowerCase();
  const adminPassword = String(formData.get('adminPassword') ?? '');
  if (adminEmail && adminPassword) {
    await db.user.create({
      data: {
        email: adminEmail,
        name: String(formData.get('adminName') ?? '') || `${name} Admin`,
        role: 'FIRM_ADMIN',
        tenantId: tenant.id,
        passwordHash: await hashPassword(adminPassword),
      },
    });
  }

  await audit(session, 'TENANT_CREATE', 'Tenant', tenant.id, { name, firmAdmin: adminEmail || null }, tenant.id);
  revalidatePath('/app/admin/tenants');
}

export async function setTenantStatusAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageTenants(session)) throw new Error('Not permitted.');
  const id = String(formData.get('tenantId'));
  const status = String(formData.get('status'));
  if (!['ACTIVE', 'ONBOARDING', 'SUSPENDED'].includes(status)) throw new Error('Invalid status');
  await db.tenant.update({ where: { id }, data: { status } });
  await audit(session, 'TENANT_STATUS', 'Tenant', id, { status }, id);
  revalidatePath('/app/admin/tenants');
}

export async function createUserAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new Error('Not permitted.');

  const role = String(formData.get('role')) as Role;
  if (!ROLES.includes(role)) throw new Error('Invalid role');

  // firm admins can only create users inside their own firm, never platform roles
  let tenantId = String(formData.get('tenantId') ?? '') || null;
  if (session.role === 'FIRM_ADMIN') {
    tenantId = session.tenantId;
    if (['SUPER_ADMIN', 'EXECUTIVE', 'CASE_MANAGER'].includes(role)) throw new Error('Not permitted for that role.');
  }
  if (role === 'SUPER_ADMIN' && session.role !== 'SUPER_ADMIN') throw new Error('Not permitted.');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  if (!email || password.length < 8) throw new Error('Email and a password of 8+ characters are required.');

  const user = await db.user.create({
    data: {
      email,
      name: String(formData.get('name') ?? '') || email,
      role,
      tenantId,
      title: String(formData.get('title') ?? '') || null,
      passwordHash: await hashPassword(password),
    },
  });
  await audit(session, 'USER_CREATE', 'User', user.id, { email, role }, tenantId);
  revalidatePath('/app/admin/users');
}

export async function toggleUserAction(formData: FormData) {
  const session = await requireSession();
  if (!canManageUsers(session)) throw new Error('Not permitted.');
  const id = String(formData.get('userId'));
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw new Error('User not found');
  if (session.role === 'FIRM_ADMIN' && user.tenantId !== session.tenantId) throw new Error('Not permitted.');
  if (user.id === session.userId) throw new Error('You cannot deactivate yourself.');
  await db.user.update({ where: { id }, data: { active: !user.active } });
  await audit(session, user.active ? 'USER_DEACTIVATE' : 'USER_ACTIVATE', 'User', id, { email: user.email }, user.tenantId);
  revalidatePath('/app/admin/users');
}
