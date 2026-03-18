import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

interface ApprovalRequestBody {
  userId: string;
  approvalStatus: 'approved' | 'denied';
  agencyId?: string;
  role?: 'admin' | 'agency' | 'planner' | 'va';
}

// POST /api/users/approval - Approve or deny a user (admin only).
// Since there is no database, this API validates the request and returns the
// computed update. The client is responsible for applying it to Zustand state.
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    const update: Record<string, unknown> = {
      approvalStatus: body.approvalStatus,
      updatedAt: new Date().toISOString(),
    };

    if (body.approvalStatus === 'approved') {
      if (body.agencyId) update.agencyId = body.agencyId;
      if (body.role) update.role = body.role;
    }

    return NextResponse.json({ userId: body.userId, update });
  } catch (error) {
    console.error('Error updating approval status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
