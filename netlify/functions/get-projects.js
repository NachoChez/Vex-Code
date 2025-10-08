import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId') || 'anonymous';

    const metadataStore = getStore('project-metadata');
    
    // List all projects
    const { blobs } = await metadataStore.list();
    
    // Filter by user and parse metadata
    const userProjects = [];
    for (const blob of blobs) {
      const metadata = await metadataStore.get(blob.key, { type: 'json' });
      if (metadata && metadata.userId === userId) {
        userProjects.push(metadata);
      }
    }

    // Sort by upload date (newest first)
    userProjects.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));

    return new Response(JSON.stringify({
      success: true,
      projects: userProjects
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get projects error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve projects',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};