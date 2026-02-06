/**
 * Database Backup Script
 * SyntexLegger - Backup before migration
 * 
 * Usage: node backup_db.js
 */

const fs = require('fs');
const path = require('path');

const SOURCE_DB = path.join(__dirname, 'db_v2.sqlite');
const BACKUP_DIR = path.join(__dirname, 'backups');

function backupDatabase() {
    // Create backup directory if not exists
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // Check if source database exists
    if (!fs.existsSync(SOURCE_DB)) {
        console.log('⚠️  Không tìm thấy database nguồn:', SOURCE_DB);
        return false;
    }

    // Generate backup filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(BACKUP_DIR, `db_v2_backup_${timestamp}.sqlite`);

    try {
        // Copy database file
        fs.copyFileSync(SOURCE_DB, backupFile);
        console.log('✅ Backup thành công:', backupFile);

        // Get file sizes
        const sourceSize = fs.statSync(SOURCE_DB).size;
        const backupSize = fs.statSync(backupFile).size;
        console.log(`   Kích thước: ${(sourceSize / 1024).toFixed(2)} KB`);

        // List existing backups
        const backups = fs.readdirSync(BACKUP_DIR).filter(f => f.endsWith('.sqlite'));
        console.log(`\n📁 Danh sách backups (${backups.length} files):`);
        backups.forEach(f => console.log(`   - ${f}`));

        return true;
    } catch (err) {
        console.error('❌ Lỗi backup:', err.message);
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    console.log('\n🔄 SyntexLegger Database Backup\n');
    backupDatabase();
}

module.exports = { backupDatabase };
