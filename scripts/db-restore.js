/**
 * Database Restore Script
 * Restores database from a backup file
 * Usage: node scripts/db-restore.js [backup-filename]
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')
const readline = require('readline')

// Load environment variables
require('dotenv').config()

const DATABASE_URL = process.env.DATABASE_URL
const BACKUPS_DIR = path.join(__dirname, '..', 'backups')

/**
 * Parse DATABASE_URL to extract connection details
 */
function parseDatabaseUrl(url) {
  if (!url) {
    throw new Error('DATABASE_URL is not set in .env')
  }

  // Format: postgresql://user:password@host:port/database
  const match = url.match(
    /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/
  )

  if (!match) {
    throw new Error('Invalid DATABASE_URL format')
  }

  return {
    user: match[1],
    password: match[2],
    host: match[3],
    port: match[4],
    database: match[5],
  }
}

/**
 * List available backups
 */
function listBackups() {
  if (!fs.existsSync(BACKUPS_DIR)) {
    console.log('❌ No backups directory found')
    return []
  }

  const files = fs.readdirSync(BACKUPS_DIR)
  const backupFiles = files
    .filter((f) => f.endsWith('.sql'))
    .map((f) => {
      const filePath = path.join(BACKUPS_DIR, f)
      const stats = fs.statSync(filePath)
      return {
        filename: f,
        path: filePath,
        size: stats.size,
        created: stats.mtime,
      }
    })
    .sort((a, b) => b.created - a.created) // Most recent first

  return backupFiles
}

/**
 * Restore database from backup file
 */
async function restoreBackup(backupFile) {
  try {
    console.log('\n🔄 Starting database restore...')

    // Verify backup file exists
    if (!fs.existsSync(backupFile)) {
      throw new Error(`Backup file not found: ${backupFile}`)
    }

    // Parse database connection
    const db = parseDatabaseUrl(DATABASE_URL)
    console.log(`   Database: ${db.database}`)
    console.log(`   Backup: ${path.basename(backupFile)}`)

    // Warning prompt
    console.log('\n⚠️  WARNING: This will REPLACE ALL DATA in the database!')
    const confirmed = await askConfirmation(
      'Type "RESTORE" to confirm (or anything else to cancel): '
    )

    if (confirmed !== 'RESTORE') {
      console.log('❌ Restore cancelled')
      return false
    }

    // Set PGPASSWORD environment variable for authentication
    const env = { ...process.env, PGPASSWORD: db.password }

    console.log('\n   Dropping existing database connections...')
    try {
      // Terminate existing connections to the database
      const terminateSQL = `SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${db.database}' AND pid <> pg_backend_pid();`
      execSync(
        `psql -U ${db.user} -h ${db.host} -p ${db.port} -d postgres -c "${terminateSQL}"`,
        { env, stdio: 'ignore' }
      )
    } catch (err) {
      // Ignore errors - connections might not exist
    }

    console.log('   Dropping and recreating database...')
    try {
      // Drop database
      execSync(
        `dropdb -U ${db.user} -h ${db.host} -p ${db.port} ${db.database} --if-exists`,
        { env, stdio: 'inherit' }
      )

      // Create database
      execSync(
        `createdb -U ${db.user} -h ${db.host} -p ${db.port} ${db.database}`,
        { env, stdio: 'inherit' }
      )
    } catch (err) {
      console.error('   Warning: Database recreation had issues, continuing...')
    }

    console.log('   Restoring data from backup...')
    const command = `psql -U ${db.user} -h ${db.host} -p ${db.port} -d ${db.database} -f "${backupFile}"`

    execSync(command, { env, stdio: 'inherit' })

    console.log('\n✅ Database restored successfully!')
    console.log('   Run "npx prisma generate" to update Prisma Client')
    return true
  } catch (error) {
    console.error('\n❌ Restore failed:', error.message)
    throw error
  }
}

/**
 * Ask for user confirmation
 */
function askConfirmation(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

/**
 * Interactive mode - show list and let user choose
 */
async function interactiveRestore() {
  console.log('📦 Available Database Backups:\n')

  const backups = listBackups()

  if (backups.length === 0) {
    console.log('❌ No backup files found in backups/ directory')
    return
  }

  // Display backups
  backups.forEach((backup, index) => {
    const sizeMB = (backup.size / (1024 * 1024)).toFixed(2)
    const date = backup.created.toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
    })
    console.log(`${index + 1}. ${backup.filename}`)
    console.log(`   Created: ${date}`)
    console.log(`   Size: ${sizeMB} MB\n`)
  })

  // Ask user to select
  const answer = await askConfirmation(
    'Enter backup number to restore (or 0 to cancel): '
  )

  const choice = parseInt(answer)

  if (isNaN(choice) || choice < 1 || choice > backups.length) {
    console.log('❌ Cancelled or invalid selection')
    return
  }

  const selectedBackup = backups[choice - 1]
  await restoreBackup(selectedBackup.path)
}

// Main execution
if (require.main === module) {
  ;(async () => {
    try {
      const backupFile = process.argv[2]

      if (backupFile) {
        // Direct restore from specified file
        const fullPath = path.isAbsolute(backupFile)
          ? backupFile
          : path.join(BACKUPS_DIR, backupFile)
        await restoreBackup(fullPath)
      } else {
        // Interactive mode
        await interactiveRestore()
      }

      process.exit(0)
    } catch (error) {
      console.error('\n💥 Restore process failed!')
      process.exit(1)
    }
  })()
}

module.exports = { restoreBackup, listBackups }
