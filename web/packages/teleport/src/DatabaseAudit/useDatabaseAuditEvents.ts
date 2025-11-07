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

import { useEffect, useMemo, useState } from 'react';

import useAttempt from 'shared/hooks/useAttemptNext';

import {
  EventRange,
  getRangeOptions,
} from 'teleport/components/EventRangePicker';
import { Event, EventCode } from 'teleport/services/audit';
import Ctx from 'teleport/teleportContext';

// Database-related event codes to filter for
const DATABASE_EVENT_CODES: EventCode[] = [
  'DATABASE_SESSION_QUERY', // TDB02I
  'DATABASE_SESSION_QUERY_FAILURE', // TDB02W
  'DATABASE_SESSION_STARTED', // TDB00I
  'DATABASE_SESSION_STARTED_FAILURE', // TDB00W
  'DATABASE_SESSION_ENDED', // TDB01I
  'POSTGRES_PARSE', // TPG00I
  'POSTGRES_BIND', // TPG01I
  'POSTGRES_EXECUTE', // TPG02I
  'POSTGRES_CLOSE', // TPG03I
  'POSTGRES_FUNCTION_CALL', // TPG04I
  'MYSQL_STATEMENT_PREPARE', // TMY00I
  'MYSQL_STATEMENT_EXECUTE', // TMY01I
  'MYSQL_STATEMENT_SEND_LONG_DATA', // TMY02I
  'MYSQL_STATEMENT_CLOSE', // TMY03I
  'MYSQL_STATEMENT_RESET', // TMY04I
  'MYSQL_STATEMENT_FETCH', // TMY05I
  'MYSQL_STATEMENT_BULK_EXECUTE', // TMY06I
  'MYSQL_INIT_DB', // TMY07I
  'MYSQL_CREATE_DB', // TMY08I
  'MYSQL_DROP_DB', // TMY09I
  'MYSQL_SHUT_DOWN', // TMY10I
  'MYSQL_PROCESS_KILL', // TMY11I
  'MYSQL_DEBUG', // TMY12I
  'MYSQL_REFRESH', // TMY13I
  'SQLSERVER_RPC_REQUEST', // TMS00I
  'CASSANDRA_BATCH_EVENT', // TCA01I
  'CASSANDRA_PREPARE_EVENT', // TCA02I
  'CASSANDRA_EXECUTE_EVENT', // TCA03I
  'CASSANDRA_REGISTER_EVENT', // TCA04I
  'ELASTICSEARCH_REQUEST', // TES00I
  'ELASTICSEARCH_REQUEST_FAILURE', // TES00E
  'OPENSEARCH_REQUEST', // TOS00I
  'OPENSEARCH_REQUEST_FAILURE', // TOS00E
  'DYNAMODB_REQUEST', // TDY01I
  'DYNAMODB_REQUEST_FAILURE', // TDY01E
  'SPANNER_RPC', // TSPN001I
  'SPANNER_RPC_DENIED', // TSPN001W
];

export default function useDatabaseAuditEvents(ctx: Ctx, clusterId: string) {
  const rangeOptions = useMemo(() => getRangeOptions(), []);
  const [range, setRange] = useState<EventRange>(rangeOptions[0]);
  const { attempt, setAttempt, run } = useAttempt('processing');
  const [results, setResults] = useState<EventResult>({
    events: [],
    fetchStartKey: '',
    fetchStatus: '',
  });

  // Filter by database events
  const filterBy = 'db';

  useEffect(() => {
    fetch();
  }, [clusterId, range]);

  // fetchMore gets events from last position from
  // last fetch, indicated by startKey. The response is
  // appended to existing events list.
  function fetchMore() {
    setResults({
      ...results,
      fetchStatus: 'loading',
    });
    ctx.auditService
      .fetchEvents(clusterId, {
        ...range,
        filterBy,
        startKey: results.fetchStartKey,
      })
      .then(res =>
        setResults({
          events: [...results.events, ...res.events],
          fetchStartKey: res.startKey,
          fetchStatus: res.startKey ? '' : 'disabled',
        })
      )
      .then(() => {
        // Filter for database-specific events
        setResults(prevResults => ({
          ...prevResults,
          events: prevResults.events.filter(event =>
            DATABASE_EVENT_CODES.includes(event.code)
          ),
        }));
      })
      .catch((err: Error) => {
        setAttempt({ status: 'failed', statusText: err.message });
      });
  }

  // fetch gets events from beginning of range and
  // replaces existing events list.
  function fetch() {
    run(() =>
      ctx.auditService
        .fetchEvents(clusterId, {
          ...range,
          filterBy,
        })
        .then(res => {
          // Filter for database-specific events
          const filteredEvents = res.events.filter(event =>
            DATABASE_EVENT_CODES.includes(event.code)
          );
          return {
            events: filteredEvents,
            startKey: res.startKey,
          };
        })
        .then(res =>
          setResults({
            events: res.events,
            fetchStartKey: res.startKey,
            fetchStatus: res.startKey ? '' : 'disabled',
          })
        )
    );
  }

  return {
    ...results,
    fetchMore,
    clusterId,
    attempt,
    range,
    setRange,
    rangeOptions,
    ctx,
  };
}

export type State = ReturnType<typeof useDatabaseAuditEvents> & {
  rangeOptions: EventRange[];
  ctx: Ctx;
};

type EventResult = {
  events: Event[];
  fetchStartKey: string;
  fetchStatus: string;
};