import { getStore } from '@netlify/blobs';

export default async (req, context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const formData = await req.formData();
    const files = formData.getAll('files');
    const filePaths = formData.getAll('filePaths');
    const projectName = formData.get('projectName');
    const userId = formData.get('userId') || 'anonymous';

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: 'No files uploaded' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // File size validation
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB per file
    const MAX_TOTAL_SIZE = 50 * 1024 * 1024; // 50MB total
    
    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return new Response(JSON.stringify({
          error: `File ${file.name} is too large. Max size is 10MB per file`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return new Response(JSON.stringify({
        error: `Total upload size (${(totalSize/1024/1024).toFixed(2)} MB) exceeds 50MB limit`
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Get blob stores
    const projectStore = getStore('robotics-projects');
    const metadataStore = getStore('project-metadata');

    // Create unique project ID
    const projectId = `${userId}-${Date.now()}`;
    
    // Store each file with folder structure
    const fileMetadata = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const relativePath = filePaths[i] || file.name;
      const fileContent = await file.text();
      const filePath = `${projectId}/${relativePath}`;
      
      // Store file content
      await projectStore.set(filePath, fileContent);
      
      fileMetadata.push({
        name: file.name,
        relativePath: relativePath,
        size: file.size,
        type: file.type,
        path: filePath
      });
    }

    // Extract folder name from first file path
    const folderName = filePaths[0]?.split('/')[0] || 'Project';

    // Store project metadata
    const metadata = {
      projectId,
      projectName,
      folderName,
      userId,
      files: fileMetadata,
      uploadDate: new Date().toISOString(),
      fileCount: files.length,
      totalSize: totalSize
    };

    await metadataStore.set(projectId, JSON.stringify(metadata));

    return new Response(JSON.stringify({
      success: true,
      projectId,
      message: 'Project uploaded successfully',
      fileCount: files.length
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