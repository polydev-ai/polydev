import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json({ error: 'Path parameter is required' }, { status: 400 })
    }

    // Security: only allow .md files from the docs directory
    if (!filePath.endsWith('.md') || !filePath.startsWith('/docs/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 })
    }

    // Remove leading slash and get absolute path
    const sanitizedPath = filePath.slice(1) // Remove leading /
    const absolutePath = path.join(process.cwd(), sanitizedPath)
    
    // Ensure the path is still within the docs directory
    const docsDir = path.join(process.cwd(), 'docs')
    if (!absolutePath.startsWith(docsDir)) {
      return NextResponse.json({ error: 'Path not allowed' }, { status: 403 })
    }

    try {
      const content = await fs.readFile(absolutePath, 'utf-8')
      return new Response(content, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
        },
      })
    } catch (fileError) {
      console.error(`File not found: ${absolutePath}`, fileError)
      return NextResponse.json({ error: 'File not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}