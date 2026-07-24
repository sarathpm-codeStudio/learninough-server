
// migrate-storage.js
import { createClient } from '@supabase/supabase-js'

const sourceClient = createClient(
    'https://wxhucjxavifzogfejkng.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind4aHVjanhhdmlmem9nZmVqa25nIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Mzg3NzI5NywiZXhwIjoyMDg5NDUzMjk3fQ.85lbT2hakbMwGb9XpVgKHKvEYWBVTKx1Lt-pVO0K6fg' // must be service_role, not anon
)

const targetClient = createClient(
    'https://jhyvykegnqqbyllgtgvr.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpoeXZ5a2VnbnFxYnlsbGd0Z3ZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDE3OTQ2OSwiZXhwIjoyMDk5NzU1NDY5fQ.Hp6-nJEsNkhs7SNUY0w4Bm0NTAQ4M9d_rirNQQl5Jlc'
)

async function migrateBucket(bucketName) {
    // 1. List all files in source bucket
    const { data: files, error: listError } = await sourceClient
        .storage
        .from(bucketName)
        .list('', { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

    if (listError) {
        console.error('List error:', listError)
        return
    }

    for (const file of files) {
        console.log(`Migrating: ${file.name}`)

        // 2. Download from source
        const { data: fileData, error: downloadError } = await sourceClient
            .storage
            .from(bucketName)
            .download(file.name)

        if (downloadError) {
            console.error(`Download failed for ${file.name}:`, downloadError)
            continue
        }

        // 3. Upload to target
        const { error: uploadError } = await targetClient
            .storage
            .from(bucketName)
            .upload(file.name, fileData, { upsert: true })

        if (uploadError) {
            console.error(`Upload failed for ${file.name}:`, uploadError)
        } else {
            console.log(`✅ Migrated: ${file.name}`)
        }
    }
}

// Run for each bucket you have
await migrateBucket('avatars')
await migrateBucket('uploads')
// add more buckets as needed