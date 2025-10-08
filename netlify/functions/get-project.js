import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const url = new URL(req.url);
    const projectId = url.searchParams.get('projectId');

    if (!projectId) {
      return new Response(JSON.stringify({ error: 'Project ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const projectStore = getStore('robotics-projects');
    const metadataStore = getStore('project-metadata');

    // Get project metadata
    const metadata = await metadataStore.get(projectId, { type: 'json' });

    if (!metadata) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all file contents
    const filesWithContent = [];
    for (const file of metadata.files) {
      const content = await projectStore.get(file.path, { type: 'text' });
      filesWithContent.push({
        ...file,
        content
      });
    }

    return new Response(JSON.stringify({
      success: true,
      project: {
        ...metadata,
        files: filesWithContent
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get project error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to retrieve project',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};