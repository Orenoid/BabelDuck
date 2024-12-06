import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic'; // always run dynamically

export async function GET() {
    return NextResponse.json({
        status: `I'm still alive.`,
        timestamp: new Date().toISOString()
    })
}
