/**
 * Database Backup Script
 * Creates a timestamped backup of the PostgreSQL database
 * Usage: node scripts/db-backup.js
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// Load environment variables
require('dotenv').config()

const DATABASE_URL = process.env.DATABASE_URL
const BACKUPS_DIR = path.join(__dirname, '..', 'backups')
const MAX_BACKUP_AGE_DAYS = 7

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
 * Create database backup using pg_dump
 */
function createBackup() {
  try {
    console.log('📦 Starting database backup...')

    // Parse database connection
    const db = parseDatabaseUrl(DATABASE_URL)
    console.log(`   Database: ${db.database}`)

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true })
    }

    // Generate backup filename with timestamp
    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\..+/, '')
      .replace('T', '_')
    const backupFile = path.join(BACKUPS_DIR, `backup_${timestamp}.sql`)

    // Execute pg_dump
    console.log('   Running pg_dump...')

    // Set PGPASSWORD environment variable for authentication
    const env = { ...process.env, PGPASSWORD: db.password }

    const command = `pg_dump -U ${db.user} -h ${db.host} -p ${db.port} -d ${db.database} -f "${backupFile}"`

    execSync(command, { env, stdio: 'inherit' })

    // Check if backup file was created
    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile)
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2)
      console.log(`✅ Backup created successfully!`)
      console.log(`   File: ${path.basename(backupFile)}`)
      console.log(`   Size: ${sizeMB} MB`)
      return backupFile
    } else {
      throw new Error('Backup file was not created')
    }
  } catch (error) {
    console.error('❌ Backup failed:', error.message)
    throw error
  }
}

/**
 * Clean up old backups (older than MAX_BACKUP_AGE_DAYS)
 */
function cleanOldBackups() {
  try {
    console.log('\n🧹 Cleaning old backups...')

    if (!fs.existsSync(BACKUPS_DIR)) {
      console.log('   No backups directory found')
      return
    }

    const files = fs.readdirSync(BACKUPS_DIR)
    const backupFiles = files.filter((f) => f.endsWith('.sql'))

    if (backupFiles.length === 0) {
      console.log('   No backup files found')
      return
    }

    const now = Date.now()
    const maxAge = MAX_BACKUP_AGE_DAYS * 24 * 60 * 60 * 1000
    let deletedCount = 0

    backupFiles.forEach((file) => {
      const filePath = path.join(BACKUPS_DIR, file)
      const stats = fs.statSync(filePath)
      const age = now - stats.mtimeMs

      if (age > maxAge) {
        fs.unlinkSync(filePath)
        console.log(`   Deleted: ${file} (${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`)
        deletedCount++
      }
    })

    if (deletedCount === 0) {
      console.log(`   No backups older than ${MAX_BACKUP_AGE_DAYS} days`)
    } else {
      console.log(`✅ Cleaned ${deletedCount} old backup(s)`)
    }

    // Show remaining backups
    const remainingBackups = fs.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith('.sql'))
    console.log(`   Total backups: ${remainingBackups.length}`)
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message)
    // Don't throw - cleanup failure shouldn't stop the backup
  }
}

// Main execution
if (require.main === module) {
  try {
    createBackup()
    cleanOldBackups()
    console.log('\n✨ Backup process completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('\n💥 Backup process failed!')
    process.exit(1)
  }
}

module.exports = { createBackup, cleanOldBackups }
