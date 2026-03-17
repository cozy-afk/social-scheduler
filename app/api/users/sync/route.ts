import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { useStore } from '@/lib/store';
import { User } from '@/types/models';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const store = useStore.getState();

    // Check if user already exists
    const existingUser = store.users.find(
      (u) => u.discordId === session.user.id || u.email === session.user.email
    );

    if (existingUser) {
      // Update existing user
      const updatedUser: User = {
        ...existingUser,
        name: session.user.name || existingUser.name,
        email: session.user.email || existingUser.email,
        updatedAt: new Date().toISOString(),
      };

      store.updateUser(existingUser.id, {
        name: updatedUser.name,
        email: updatedUser.email,
        updatedAt: updatedUser.updatedAt,
      });

      return NextResponse.json({ user: updatedUser });
    }

    // Create new user from Discord session
    const newUser: User = {
      id: `discord-${session.user.id}`,
      email: session.user.email || '',
      name: session.user.name || 'Discord User',
      role: 'agency', // Default role
      assignedModels: [],
      discordId: session.user.id,
      approvalStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.addUser(newUser);

    return NextResponse.json({ user: newUser }, { status: 201 });
  } catch (error) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
