/**
 * Teleport
 * Copyright (C) 2023  Gravitational, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import React from 'react';

import { Database, Terminal, AlertTriangle, CheckCircle, XCircle } from 'design/Icon';
import { EventCode } from 'teleport/services/audit/types';
import { Event } from 'teleport/services/audit';

/**
 * Returns an appropriate icon for database events
 */
export function getDatabaseEventIcon(eventCode: EventCode): React.ReactNode {
  switch (eventCode) {
    case 'DATABASE_SESSION_QUERY':
    case 'POSTGRES_EXECUTE':
    case 'MYSQL_STATEMENT_EXECUTE':
    case 'CASSANDRA_EXECUTE_EVENT':
    case 'ELASTICSEARCH_REQUEST':
    case 'OPENSEARCH_REQUEST':
    case 'DYNAMODB_REQUEST':
    case 'SPANNER_RPC':
      return <Terminal size="small" />;

    case 'DATABASE_SESSION_STARTED':
    case 'DATABASE_SESSION_ENDED':
      return <CheckCircle size="small" />;

    case 'DATABASE_SESSION_STARTED_FAILURE':
    case 'DATABASE_SESSION_QUERY_FAILURE':
    case 'ELASTICSEARCH_REQUEST_FAILURE':
    case 'OPENSEARCH_REQUEST_FAILURE':
    case 'DYNAMODB_REQUEST_FAILURE':
    case 'SPANNER_RPC_DENIED':
      return <XCircle size="small" />;

    case 'DATABASE_SESSION_MALFORMED_PACKET':
    case 'DATABASE_SESSION_USER_CREATE_FAILURE':
    case 'DATABASE_SESSION_USER_DEACTIVATE_FAILURE':
      return <AlertTriangle size="small" />;

    default:
      return <Database size="small" />;
  }
}

/**
 * Returns a human-readable description for database events
 */
export function getDatabaseEventDescription(event: Event): string {
  const { code, user } = event;
  const raw = event.raw as any;
  const dbService = raw?.db_service || 'Unknown';
  const dbUser = raw?.db_user || 'Unknown';

  switch (code) {
    case 'DATABASE_SESSION_QUERY':
      return `Database query executed by ${user} on ${dbService}`;

    case 'DATABASE_SESSION_QUERY_FAILURE':
      return `Database query failed for ${user} on ${dbService}`;

    case 'DATABASE_SESSION_STARTED':
      return `Database session started by ${user} on ${dbService}`;

    case 'DATABASE_SESSION_STARTED_FAILURE':
      return `Database session start failed for ${user} on ${dbService}`;

    case 'DATABASE_SESSION_ENDED':
      return `Database session ended by ${user} on ${dbService}`;

    case 'DATABASE_SESSION_MALFORMED_PACKET':
      return `Malformed database packet detected on ${dbService}`;

    case 'DATABASE_SESSION_PERMISSIONS_UPDATE':
      return `Database permissions updated for ${user} on ${dbService}`;

    case 'DATABASE_SESSION_USER_CREATE':
      return `Database user created: ${dbUser}`;

    case 'DATABASE_SESSION_USER_CREATE_FAILURE':
      return `Failed to create database user: ${dbUser}`;

    case 'DATABASE_SESSION_USER_DEACTIVATE':
      return `Database user deactivated: ${dbUser}`;

    case 'DATABASE_SESSION_USER_DEACTIVATE_FAILURE':
      return `Failed to deactivate database user: ${dbUser}`;

    case 'POSTGRES_PARSE':
      return `PostgreSQL query parsed on ${dbService}`;

    case 'POSTGRES_BIND':
      return `PostgreSQL query bound on ${dbService}`;

    case 'POSTGRES_EXECUTE':
      return `PostgreSQL query executed on ${dbService}`;

    case 'POSTGRES_CLOSE':
      return `PostgreSQL statement closed on ${dbService}`;

    case 'POSTGRES_FUNCTION_CALL':
      return `PostgreSQL function called on ${dbService}`;

    case 'MYSQL_STATEMENT_PREPARE':
      return `MySQL statement prepared on ${dbService}`;

    case 'MYSQL_STATEMENT_EXECUTE':
      return `MySQL statement executed on ${dbService}`;

    case 'MYSQL_STATEMENT_SEND_LONG_DATA':
      return `MySQL long data sent on ${dbService}`;

    case 'MYSQL_STATEMENT_CLOSE':
      return `MySQL statement closed on ${dbService}`;

    case 'MYSQL_STATEMENT_RESET':
      return `MySQL statement reset on ${dbService}`;

    case 'MYSQL_STATEMENT_FETCH':
      return `MySQL statement fetched on ${dbService}`;

    case 'MYSQL_STATEMENT_BULK_EXECUTE':
      return `MySQL bulk statement executed on ${dbService}`;

    case 'MYSQL_INIT_DB':
      return `MySQL database initialized on ${dbService}`;

    case 'MYSQL_CREATE_DB':
      return `MySQL database created on ${dbService}`;

    case 'MYSQL_DROP_DB':
      return `MySQL database dropped on ${dbService}`;

    case 'MYSQL_SHUT_DOWN':
      return `MySQL shutdown initiated on ${dbService}`;

    case 'MYSQL_PROCESS_KILL':
      return `MySQL process killed on ${dbService}`;

    case 'MYSQL_DEBUG':
      return `MySQL debug command executed on ${dbService}`;

    case 'MYSQL_REFRESH':
      return `MySQL refresh command executed on ${dbService}`;

    case 'SQLSERVER_RPC_REQUEST':
      return `SQL Server RPC request on ${dbService}`;

    case 'CASSANDRA_BATCH_EVENT':
      return `Cassandra batch operation on ${dbService}`;

    case 'CASSANDRA_PREPARE_EVENT':
      return `Cassandra query prepared on ${dbService}`;

    case 'CASSANDRA_EXECUTE_EVENT':
      return `Cassandra query executed on ${dbService}`;

    case 'CASSANDRA_REGISTER_EVENT':
      return `Cassandra query registered on ${dbService}`;

    case 'ELASTICSEARCH_REQUEST':
      return `Elasticsearch request on ${dbService}`;

    case 'ELASTICSEARCH_REQUEST_FAILURE':
      return `Elasticsearch request failed on ${dbService}`;

    case 'OPENSEARCH_REQUEST':
      return `OpenSearch request on ${dbService}`;

    case 'OPENSEARCH_REQUEST_FAILURE':
      return `OpenSearch request failed on ${dbService}`;

    case 'DYNAMODB_REQUEST':
      return `DynamoDB request on ${dbService}`;

    case 'DYNAMODB_REQUEST_FAILURE':
      return `DynamoDB request failed on ${dbService}`;

    case 'SPANNER_RPC':
      return `Cloud Spanner RPC on ${dbService}`;

    case 'SPANNER_RPC_DENIED':
      return `Cloud Spanner RPC denied on ${dbService}`;

    default:
      return `Database event on ${dbService}`;
  }
}

/**
 * Determines if an event is a query event (contains SQL/NoSQL query)
 */
export function isQueryEvent(event: Event): boolean {
  const { code } = event;
  const raw = event.raw as any;

  // Check event codes that typically contain queries
  const queryEventCodes: EventCode[] = [
    'DATABASE_SESSION_QUERY',
    'DATABASE_SESSION_QUERY_FAILURE',
    'POSTGRES_PARSE',
    'MYSQL_STATEMENT_PREPARE',
    'CASSANDRA_PREPARE_EVENT',
    'ELASTICSEARCH_REQUEST',
    'OPENSEARCH_REQUEST',
    'DYNAMODB_REQUEST',
  ];

  if (queryEventCodes.includes(code)) {
    return true;
  }

  // Check if the raw event contains query fields
  return !!(raw?.db_query || raw?.query);
}

/**
 * Extracts the query text from an event
 */
export function getEventQuery(event: Event): string | null {
  const raw = event.raw as any;
  return raw?.db_query || raw?.query || null;
}

/**
 * Determines if an event represents a successful operation
 */
export function isSuccessfulEvent(event: Event): boolean {
  const { code } = event;

  // Explicit failure codes
  const failureCodes: EventCode[] = [
    'DATABASE_SESSION_STARTED_FAILURE',
    'DATABASE_SESSION_QUERY_FAILURE',
    'DATABASE_SESSION_USER_CREATE_FAILURE',
    'DATABASE_SESSION_USER_DEACTIVATE_FAILURE',
    'ELASTICSEARCH_REQUEST_FAILURE',
    'OPENSEARCH_REQUEST_FAILURE',
    'DYNAMODB_REQUEST_FAILURE',
    'SPANNER_RPC_DENIED',
  ];

  return !failureCodes.includes(code);
}