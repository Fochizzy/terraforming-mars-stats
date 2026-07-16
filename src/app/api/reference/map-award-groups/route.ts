import { NextResponse } from 'next/server';
import { listMapAwardGroups } from '@/lib/db/reference-repo';

export async function GET() {
  try {
    const groups = await listMapAwardGroups();

    return NextResponse.json(groups, {
      headers: {
        'Cache-Control': 'private, max-age=300',
      },
    });
  } catch (error) {
    console.error('[map-award-groups] Failed to load map award references', error);

    return NextResponse.json(
      { error: 'Unable to load map award references.' },
      { status: 500 },
    );
  }
}
