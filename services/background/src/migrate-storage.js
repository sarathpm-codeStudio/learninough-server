
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

async function listAllFiles(bucketName, prefix = '') {
    const { data: entries, error: listError } = await sourceClient
        .storage
        .from(bucketName)
        .list(prefix, { limit: 1000, sortBy: { column: 'name', order: 'asc' } })

    if (listError) {
        console.error(`List error at "${prefix}":`, listError)
        return []
    }

    const paths = []
    for (const entry of entries) {
        const fullPath = prefix ? `${prefix}/${entry.name}` : entry.name
        if (entry.id === null) {
            // folder — recurse into it
            paths.push(...await listAllFiles(bucketName, fullPath))
        } else {
            paths.push(fullPath)
        }
    }
    return paths
}

async function ensureTargetBucket(bucketName) {
    const { data: sourceBucket, error: getError } = await sourceClient.storage.getBucket(bucketName)
    if (getError) {
        console.error(`Source bucket "${bucketName}" not found:`, getError.message)
        return false
    }

    const { data: existing } = await targetClient.storage.getBucket(bucketName)
    if (existing) return true

    const { error: createError } = await targetClient.storage.createBucket(bucketName, {
        public: sourceBucket.public,
        fileSizeLimit: sourceBucket.file_size_limit ?? undefined,
        allowedMimeTypes: sourceBucket.allowed_mime_types ?? undefined,
    })
    if (createError) {
        console.error(`Failed to create target bucket "${bucketName}":`, createError.message)
        return false
    }
    console.log(`Created target bucket "${bucketName}" (public: ${sourceBucket.public})`)
    return true
}

async function migrateBucket(bucketName) {
    console.log(`\n=== Bucket: ${bucketName} ===`)
    if (!await ensureTargetBucket(bucketName)) return

    const paths = await listAllFiles(bucketName)
    console.log(`Found ${paths.length} files`)

    for (const path of paths) {
        console.log(`Migrating: ${path}`)

        const { data: fileData, error: downloadError } = await sourceClient
            .storage
            .from(bucketName)
            .download(path)

        if (downloadError) {
            console.error(`Download failed for ${path}:`, downloadError)
            continue
        }

        const { error: uploadError } = await targetClient
            .storage
            .from(bucketName)
            .upload(path, fileData, { upsert: true })

        if (uploadError) {
            console.error(`Upload failed for ${path}:`, uploadError)
        } else {
            console.log(`✅ Migrated: ${path}`)
        }
    }
}

// Migrate every bucket in the source project
const { data: buckets, error: bucketsError } = await sourceClient.storage.listBuckets()
if (bucketsError) {
    console.error('Failed to list source buckets:', bucketsError.message)
    process.exit(1)
}
console.log(`Source buckets: ${buckets.map(b => b.name).join(', ') || '(none)'}`)
for (const bucket of buckets) {
    await migrateBucket(bucket.name)
}
console.log('\nDone.')