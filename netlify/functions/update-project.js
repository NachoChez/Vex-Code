import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const { projectId, files } = await req.json();

    if (!projectId || !files) {
      return new Response(JSON.stringify({ error: 'Project ID and files required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const projectStore = getStore('robotics-projects');
    const metadataStore = getStore('project-metadata');

    // Get existing metadata
    const metadata = await metadataStore.get(projectId, { type: 'json' });

    if (!metadata) {
      return new Response(JSON.stringify({ error: 'Project not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update each file
    for (const file of files) {
      const filePath = file.path;
      
      // Check if file is text-based or binary
      const isTextFile = /\.(cpp|h|c|txt|ino|hpp|cc|cxx|json|xml|md|gitignore|mk)$/i.test(file.name);
      
      if (isTextFile || file.encoding === 'utf8') {
        // Store as text
        await projectStore.set(filePath, file.content);
      } else {
        // Keep binary files as-is
        await projectStore.set(filePath, file.content);
      }
    }

    // Update metadata with new timestamp
    metadata.lastModified = new Date().toISOString();
    metadata.files = files;
    
    await metadataStore.set(projectId, JSON.stringify(metadata));

    return new Response(JSON.stringify({
      success: true,
      message: 'Project updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update project error:', error);
    return new Response(JSON.stringify({
      error: 'Failed to update project',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};