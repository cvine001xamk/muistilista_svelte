/**
 * db.ts — Dexie IndexedDB database for offline-first storage.
 *
 * Tables:
 *  - tehtavat: cached task records (EnrichedTehtava shape minus derived fields)
 *  - suoritukset: cached completion records
 *  - ostokset: cached shopping-list items
 *  - syncQueue: pending mutations to replay when connectivity is restored
 */

import Dexie, { type Table } from 'dexie';

// ----------------------------------------------------------------
// Sync queue entry shape
// ----------------------------------------------------------------
export type SyncOperation = 'INSERT' | 'UPDATE' | 'DELETE';
export type SyncTable = 'tehtavat' | 'suoritukset' | 'ostokset';

export interface SyncQueueEntry {
	/** Auto-incremented local ID */
	id?: number;
	/** ISO timestamp when the mutation was queued */
	createdAt: string;
	table: SyncTable;
	operation: SyncOperation;
	/** For INSERT/UPDATE — the data payload */
	payload?: Record<string, unknown>;
	/** For UPDATE/DELETE — the row's server id */
	recordId?: number | string;
	/** For INSERT — the temporary local ID assigned before server confirmation */
	tempId?: number | string;
	/** Number of replay attempts */
	attempts: number;
}

// ----------------------------------------------------------------
// Dexie DB class
// ----------------------------------------------------------------
class MuistilistaDB extends Dexie {
	tehtavat!: Table<Tehtava, number>;
	suoritukset!: Table<Suoritus, number>;
	ostokset!: Table<Ostos, string>;
	syncQueue!: Table<SyncQueueEntry, number>;

	constructor() {
		super('MuistilistaDB');

		this.version(1).stores({
			// Indexed fields only; Dexie stores the full object
			tehtavat: 'id, nimi, suoritusvali, kertasuoritus, created_at',
			suoritukset: 'id, tehtava_id, suoritettu, tehtava_nimi',
			ostokset: 'id, nimi, completed, created_at',
			syncQueue: '++id, table, operation, recordId, tempId, createdAt, attempts'
		});
	}
}

export const db = new MuistilistaDB();
