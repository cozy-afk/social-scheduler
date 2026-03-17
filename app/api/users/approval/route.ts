import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { useStore } from '@/lib/store';
import { User } from '@/types/models';

interface ApprovalRequestBody {
  userId: string;
  approvalStatus: 'approved' | 'denied';
  agencyId?: string;
  role?: 'admin' | 'agency' | 'planner' | 'va';
}

// POST /api/users/approval - Approve or deny a user (admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can approve/deny users
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: ApprovalRequestBody = await request.json();

    if (!body.userId || !body.approvalStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, approvalStatus' },
        { status: 400 }
      );
    }

    if (!['approved', 'denied'].includes(body.approvalStatus)) {
      return NextResponse.json(
        { error: 'Invalid approval status. Must be "approved" or "denied"' },
        { status: 400 }
      );
    }

    const store = useStore.getState();

    // Check if user exists
    const existingUser = store.users.find((u) => u.id === body.userId);
    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Prepare updates
    const updates: Partial<User> = {
      approvalStatus: body.approvalStatus,
      updatedAt: new Date().toISOString(),
    };

    // If approving and agencyId/role provided, include them
    if (body.approvalStatus === 'approved') {
      if (body.agencyId) {
        updates.agencyId = body.agencyId;
      }
      if (body.role) {
        updates.role = body.role;
      }
    }

    // Update user
    store.updateUser(body.userId, updates);

    const updatedUser = store.users.find((u) => u.id === body.userId);

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error('Error updating approval status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
