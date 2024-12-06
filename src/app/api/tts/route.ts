import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const subscriptionKey = process.env.AZURE_SPEECH_KEY
    const region = process.env.NEXT_PUBLIC_AZURE_SPEECH_REGION

    if (!subscriptionKey || !region) {
      return NextResponse.json(
        { error: 'Azure Speech credentials not configured' },
        { status: 500 }
      )
    }

    const response = await fetch(
      `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`,
      {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )

    if (!response.ok) {
      throw new Error(`Failed to fetch token: ${response.statusText}`)
    }

    const token = await response.text()

    return NextResponse.json({ token })
  } catch (error) {
    console.error('Error fetching Azure TTS token:', error)
    return NextResponse.json(
      { error: 'Failed to get Azure TTS token' },
      { status: 500 }
    )
  }
}
