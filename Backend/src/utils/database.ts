import { Database } from '@jodu555/mysqlapi';

export function setupTables() {
    const database = Database.getDatabase();
    database.createTable('sniffEntries', {
        userUUID: {
            type: 'varchar(64)',
        },
        twitchStreamerName: {
            type: 'varchar(64)',
        },
        everyxMinute: {
            type: 'INT',
        },
        lastCheck: {
            type: 'BIGINT',
        },
    });

    database.createTable('invoices', {
        ID: {
            type: 'varchar(64)',
            null: false,
        },
        userUUID: {
            type: 'varchar(64)',
            null: false,
        },
        paypalOrderID: {
            type: 'varchar(64)',
            null: true,
        },
        amount: {
            type: 'BIGINT',
            null: false,
        },
        status: {
            type: 'varchar(32)',
            null: false,
        },
        createdAt: {
            type: 'BIGINT',
            null: false,
        },
        paidAt: {
            type: 'BIGINT',
            null: true,
        },
    });

    database.createTable('recordEntries', {
        options: {
            PK: 'ID',
        },
        ID: {
            type: 'varchar(64)',
            null: false,
        },
        twitchStreamerName: {
            type: 'varchar(64)',
            null: false,
        },
        userUUID: {
            type: 'varchar(64)',
            null: false,
        },
        state: {
            type: 'VARCHAR(32)',
            null: false,
        },
        metas: {
            type: 'TEXT',
            null: false,
        },
        videoMeta: {
            type: 'TEXT',
            null: true,
        },
        createdAt: {
            type: 'BIGINT',
            null: false
        },
        deletedAt: {
            type: 'BIGINT',
            null: true
        },
        finishedAt: {
            type: 'BIGINT',
            null: true,
        },
        recordingFilePath: {
            type: 'varchar(255)',
            null: false,
        },
        outputFilePath: {
            type: 'varchar(255)',
            null: false,
        },
        imageFilePath: {
            type: 'varchar(255)',
            null: true,
        },
        imageUrl: {
            type: 'varchar(255)',
            null: true,
        }
    });

    database.createTable('emails', {
        options: {
            PK: 'ID',
            K: ['userUUID', 'status'],
        },
        ID: {
            type: 'varchar(64)',
            null: false,
        },
        userUUID: {
            type: 'varchar(64)',
            null: false,
        },
        email_type: {
            //The email type to create the email for like 'VERIFICATION' or 'INVOICE'
            type: 'varchar(64)',
            null: false,
        },
        status: {
            //The status of the email like 'PENDING' or 'SENT'
            type: 'varchar(64)',
            null: false,
        },
        subject: {
            //The subject of the email
            type: 'varchar(255)',
            null: false,
        },
        html: {
            //The html of the email
            type: 'TEXT',
            null: false,
        },
        text: {
            //The text of the email
            type: 'TEXT',
            null: false,
        },
        data: {
            //The data to send with the email
            type: 'TEXT',
            null: true,
        },
        sent_at: {
            //The time the email was sent
            type: 'BIGINT',
            null: true,
        },
        created_at: {
            //The time the email record was created
            type: 'BIGINT',
            null: false,
        }
    });

}