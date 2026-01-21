const sqlite3 = require('sqlite3').verbose();

const DBSOURCE = "db_v2.sqlite";

/**
 * Migration Script: Add HCSN fields to Contracts and Projects tables
 * 
 * Adds necessary fields for HCSN compliance:
 * - Contracts: fund_source_id, budget_estimate_id, contract_type, etc.
 * - Projects: fund_source_id, budget_estimate_id, project_type, etc.
 */

const db = new sqlite3.Database(DBSOURCE, (err) => {
    if (err) {
        console.error('❌ Error connecting to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to database for migration.');
});

const contractsMigrations = [
    {
        name: 'partner_code',
        sql: "ALTER TABLE contracts ADD COLUMN partner_code TEXT",
        description: "Add partner_code (foreign key to partners)"
    },
    {
        name: 'contract_type',
        sql: "ALTER TABLE contracts ADD COLUMN contract_type TEXT",
        description: "Add contract_type (PROCUREMENT, SERVICE, CONSTRUCTION, CONSULTING, OTHER)"
    },
    {
        name: 'fund_source_id',
        sql: "ALTER TABLE contracts ADD COLUMN fund_source_id TEXT",
        description: "Add fund_source_id (link to fund_sources)"
    },
    {
        name: 'budget_estimate_id',
        sql: "ALTER TABLE contracts ADD COLUMN budget_estimate_id TEXT",
        description: "Add budget_estimate_id (link to budget_estimates)"
    },
    {
        name: 'approval_no',
        sql: "ALTER TABLE contracts ADD COLUMN approval_no TEXT",
        description: "Add approval_no (approval decision number)"
    },
    {
        name: 'approval_date',
        sql: "ALTER TABLE contracts ADD COLUMN approval_date TEXT",
        description: "Add approval_date"
    },
    {
        name: 'payment_method',
        sql: "ALTER TABLE contracts ADD COLUMN payment_method TEXT",
        description: "Add payment_method (CASH, TRANSFER, INSTALLMENT)"
    },
    {
        name: 'payment_terms',
        sql: "ALTER TABLE contracts ADD COLUMN payment_terms TEXT",
        description: "Add payment_terms"
    },
    {
        name: 'warranty_period',
        sql: "ALTER TABLE contracts ADD COLUMN warranty_period INTEGER",
        description: "Add warranty_period (in months)"
    },
    {
        name: 'notes',
        sql: "ALTER TABLE contracts ADD COLUMN notes TEXT",
        description: "Add notes field"
    }
];

const projectsMigrations = [
    {
        name: 'project_type',
        sql: "ALTER TABLE projects ADD COLUMN project_type TEXT",
        description: "Add project_type (INVESTMENT, PUBLIC_SERVICE, RESEARCH, INFRASTRUCTURE)"
    },
    {
        name: 'fund_source_id',
        sql: "ALTER TABLE projects ADD COLUMN fund_source_id TEXT",
        description: "Add fund_source_id (link to fund_sources)"
    },
    {
        name: 'budget_estimate_id',
        sql: "ALTER TABLE projects ADD COLUMN budget_estimate_id TEXT",
        description: "Add budget_estimate_id (link to budget_estimates)"
    },
    {
        name: 'approval_no',
        sql: "ALTER TABLE projects ADD COLUMN approval_no TEXT",
        description: "Add approval_no (approval decision number)"
    },
    {
        name: 'approval_date',
        sql: "ALTER TABLE projects ADD COLUMN approval_date TEXT",
        description: "Add approval_date"
    },
    {
        name: 'managing_agency',
        sql: "ALTER TABLE projects ADD COLUMN managing_agency TEXT",
        description: "Add managing_agency (managing organization)"
    },
    {
        name: 'task_code',
        sql: "ALTER TABLE projects ADD COLUMN task_code TEXT",
        description: "Add task_code (budget task code)"
    },
    {
        name: 'objective',
        sql: "ALTER TABLE projects ADD COLUMN objective TEXT",
        description: "Add objective (project objective)"
    },
    {
        name: 'expected_output',
        sql: "ALTER TABLE projects ADD COLUMN expected_output TEXT",
        description: "Add expected_output (expected deliverables)"
    },
    {
        name: 'completion_date',
        sql: "ALTER TABLE projects ADD COLUMN completion_date TEXT",
        description: "Add completion_date (actual completion date)"
    },
    {
        name: 'partner_code',
        sql: "ALTER TABLE projects ADD COLUMN partner_code TEXT",
        description: "Add partner_code (foreign key to partners)"
    }
];

function checkColumnExists(tableName, columnName) {
    return new Promise((resolve, reject) => {
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                reject(err);
            } else {
                const exists = columns.some(col => col.name === columnName);
                resolve(exists);
            }
        });
    });
}

function runMigration(migration) {
    return new Promise((resolve, reject) => {
        db.run(migration.sql, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function migrateTable(tableName, migrations) {
    console.log(`\n📋 Migrating table: ${tableName}`);
    console.log('─'.repeat(60));

    let addedCount = 0;
    let skippedCount = 0;

    for (const migration of migrations) {
        try {
            const exists = await checkColumnExists(tableName, migration.name);

            if (exists) {
                console.log(`⏭️  SKIP: ${migration.name} (already exists)`);
                skippedCount++;
            } else {
                await runMigration(migration);
                console.log(`✅ ADD: ${migration.name} - ${migration.description}`);
                addedCount++;
            }
        } catch (err) {
            console.error(`❌ ERROR adding ${migration.name}:`, err.message);
        }
    }

    console.log(`\n📊 Summary: ${addedCount} added, ${skippedCount} skipped`);
}

async function updateExistingData() {
    console.log(`\n🔄 Updating existing data...`);
    console.log('─'.repeat(60));

    // Update contracts: Convert partner text to partner_code (if exists in partners table)
    return new Promise((resolve) => {
        db.all("SELECT id, partner FROM contracts WHERE partner IS NOT NULL", [], (err, contracts) => {
            if (err || !contracts || contracts.length === 0) {
                console.log('ℹ️  No contracts to update');
                return resolve();
            }

            let updateCount = 0;
            contracts.forEach((contract, index) => {
                // Try to find matching partner by name
                db.get("SELECT partner_code FROM partners WHERE partner_name = ?", [contract.partner], (err, partner) => {
                    if (!err && partner) {
                        db.run("UPDATE contracts SET partner_code = ? WHERE id = ?", [partner.partner_code, contract.id], (updateErr) => {
                            if (!updateErr) {
                                updateCount++;
                            }
                        });
                    }

                    // On last iteration, print summary
                    if (index === contracts.length - 1) {
                        setTimeout(() => {
                            console.log(`✅ Updated ${updateCount} contracts with partner_code`);
                            resolve();
                        }, 100);
                    }
                });
            });
        });
    });
}

async function seedDefaultData() {
    console.log(`\n🌱 Seeding default data for migrated fields...`);
    console.log('─'.repeat(60));

    // Set default contract_type for existing contracts based on type field
    await new Promise((resolve) => {
        db.run(`
            UPDATE contracts 
            SET contract_type = CASE 
                WHEN type = 'sales' THEN 'SERVICE'
                WHEN type = 'purchase' THEN 'PROCUREMENT'
                ELSE 'OTHER'
            END
            WHERE contract_type IS NULL
        `, (err) => {
            if (!err) {
                console.log('✅ Set default contract_type for existing contracts');
            }
            resolve();
        });
    });

    // Set default project_type for existing projects
    await new Promise((resolve) => {
        db.run(`
            UPDATE projects 
            SET project_type = 'PUBLIC_SERVICE'
            WHERE project_type IS NULL
        `, (err) => {
            if (!err) {
                console.log('✅ Set default project_type for existing projects');
            }
            resolve();
        });
    });

    console.log('✅ Default data seeding complete');
}

async function main() {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 HCSN Migration: Contracts & Projects Tables');
    console.log('='.repeat(60));

    try {
        // Migrate contracts table
        await migrateTable('contracts', contractsMigrations);

        // Migrate projects table
        await migrateTable('projects', projectsMigrations);

        // Update existing data
        await updateExistingData();

        // Seed default values
        await seedDefaultData();

        console.log('\n' + '='.repeat(60));
        console.log('✅ Migration completed successfully!');
        console.log('='.repeat(60) + '\n');

    } catch (err) {
        console.error('\n❌ Migration failed:', err);
    } finally {
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('📦 Database connection closed.');
            }
            process.exit(0);
        });
    }
}

// Run migration
main();
