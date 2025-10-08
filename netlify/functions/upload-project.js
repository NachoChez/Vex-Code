import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files');
    const projectName = formData.get('projectName');
    const userId = formData.get('userId') || 'anonymous';

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // File size validation
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
    const MAX_TOTAL_SIZE = 20 * 1024 * 1024; // 20MB
    
    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({
          error: `File ${file.name} is too large. Max size is 5MB`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return new Response(JSON.stringify({
        error: 'Total upload size exceeds 20MB limit'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Get blob stores
    const projectStore = getStore('robotics-projects');
    const metadataStore = getStore('project-metadata');

    // Create unique project ID
    const projectId = `${userId}-${Date.now()}`;
    
    // Store each file
    const fileMetadata = [];
    for (const file of files) {
      const fileName = file.name;
      const fileContent = await file.text();
      const filePath = `${projectId}/${fileName}`;
      
      await projectStore.set(filePath, fileContent);
      
      fileMetadata.push({
        name: fileName,
        size: file.size,
        type: file.type,
        path: filePath
      });
    }

    // Store project metadata
    const metadata = {
      projectId,
      projectName,
      userId,
      files: fileMetadata,
      uploadDate: new Date().toISOString(),
      fileCount: files.length
    };

    await metadataStore.set(projectId, JSON.stringify(metadata));

    return new Response(JSON.stringify({
      success: true,
      projectId,
      message: 'Project uploaded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return new Response(JSON.stringify({
      error: 'Upload failed',
      message: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};