import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { projectId } = await req.json();

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

    // Delete all project files
    for (const file of metadata.files) {
      await projectStore.delete(file.path);
    }

    // Delete project metadata
    await metadataStore.delete(projectId);

    return new Response(JSON.stringify({
      success: true,
      message: 'Project deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete project error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to delete project',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};