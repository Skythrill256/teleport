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

import React, { useState } from 'react';

import { Button, Text, Flex, ButtonBorder, ButtonPrimary } from 'design';
import { P } from 'design/typography';
import { ArrowForward, Clock, Database, User } from 'design/Icon';
import { formatRelative, formatISO } from 'date-fns';

import { Event } from 'teleport/services/audit';
import { EventCode } from 'teleport/services/audit/types';

import { getDatabaseEventIcon, getDatabaseEventDescription } from './eventHelpers';

type Props = {
  events: Event[];
  fetchMore: () => void;
  fetchStatus: string;
};

export function DatabaseQueryEventList(props: Props) {
  const { events, fetchMore, fetchStatus } = props;
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  if (events.length === 0) {
    return (
      <Flex alignItems="center" justifyContent="center" height="200px">
        <P typography="body1" color="text.muted">
          No database query events found in the selected time range.
        </P>
      </Flex>
    );
  }

  return (
    <Flex flexDirection="column" width="100%">
      {/* Event List */}
      <Flex flexDirection="column" width="100%">
        {events.map((event, index) => (
          <DatabaseQueryEventRow
            key={event.id}
            event={event}
            onSelect={() => setSelectedEvent(event)}
            isLast={index === events.length - 1}
          />
        ))}
      </Flex>

      {/* Load More Button */}
      {fetchStatus !== 'disabled' && (
        <Flex justifyContent="center" mt={4}>
          <ButtonBorder
            width="200px"
            onClick={fetchMore}
            disabled={fetchStatus === 'loading'}
          >
            {fetchStatus === 'loading' ? 'Loading...' : 'Load More'}
          </ButtonBorder>
        </Flex>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <EventDetailsModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </Flex>
  );
}

type EventRowProps = {
  event: Event;
  onSelect: () => void;
  isLast: boolean;
};

function DatabaseQueryEventRow({ event, onSelect, isLast }: EventRowProps) {
  const icon = getDatabaseEventIcon(event.code);
  const description = getDatabaseEventDescription(event);

  // Extract database-specific information
  const dbService = (event.raw as any)?.db_service || 'Unknown';
  const dbUser = (event.raw as any)?.db_user || 'Unknown';
  const dbName = (event.raw as any)?.db_name || 'Unknown';
  const query = (event.raw as any)?.db_query || (event.raw as any)?.query || '';

  return (
    <Flex
      flexDirection="column"
      borderBottom={isLast ? 'none' : 1}
      borderBottomColor="border.faded"
      py={3}
      css={`
        &:hover {
          background-color: ${props => props.theme.colors.spotBackground[0]};
        }
      `}
    >
      <Flex alignItems="center" justifyContent="space-between">
        <Flex alignItems="center" flex={1}>
          <Flex
            alignItems="center"
            justifyContent="center"
            size={40}
            borderRadius={2}
            bg="primary.light"
            color="primary.main"
            mr={3}
          >
            {icon}
          </Flex>

          <Flex flexDirection="column" flex={1}>
            <Flex alignItems="center" mb={1}>
              <Text typography="body1" bold color="text.primary" mr={2}>
                {description}
              </Text>
              <Text typography="body3" color="text.secondary">
                {event.code}
              </Text>
            </Flex>

            <Flex alignItems="center" mb={1}>
              <Database size="small" mr={1} color="text.secondary" />
              <Text typography="body2" color="text.secondary" mr={3}>
                Service: {dbService}
              </Text>
              <User size="small" mr={1} color="text.secondary" />
              <Text typography="body2" color="text.secondary" mr={3}>
                User: {dbUser}
              </Text>
              <Text typography="body2" color="text.secondary">
                Database: {dbName}
              </Text>
            </Flex>

            {query && (
              <Text
                typography="body3"
                color="text.muted"
                css={`
                  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                  background-color: ${props => props.theme.colors.spotBackground[1]};
                  padding: 4px 8px;
                  border-radius: 4px;
                  max-width: 600px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                `}
              >
                {query}
              </Text>
            )}
          </Flex>
        </Flex>

        <Flex alignItems="center">
          <Flex flexDirection="column" alignItems="flex-end" mr={3}>
            <Text typography="body3" color="text.secondary">
              {formatRelative(event.time, new Date())}
            </Text>
            <Text typography="body4" color="text.muted">
              {formatISO(event.time)}
            </Text>
          </Flex>
          <ButtonPrimary size="small" onClick={onSelect}>
            Details
          </ButtonPrimary>
        </Flex>
      </Flex>
    </Flex>
  );
}

type ModalProps = {
  event: Event;
  onClose: () => void;
};

function EventDetailsModal({ event, onClose }: ModalProps) {
  const icon = getDatabaseEventIcon(event.code);
  const description = getDatabaseEventDescription(event);

  // Extract all available database information
  const raw = event.raw as any;
  const dbService = raw?.db_service || 'Unknown';
  const dbUser = raw?.db_user || raw?.username || 'Unknown';
  const dbName = raw?.db_name || 'Unknown';
  const query = raw?.db_query || raw?.query || 'N/A';
  const sessionUser = raw?.user || 'Unknown';

  return (
    <Flex
      position="fixed"
      top={0}
      left={0}
      right={0}
      bottom={0}
      bg="rgba(0, 0, 0, 0.5)"
      alignItems="center"
      justifyContent="center"
      zIndex={1000}
    >
      <Flex
        flexDirection="column"
        bg="background.primary"
        borderRadius={3}
        width="90%"
        maxWidth="800px"
        maxHeight="80%"
        overflow="auto"
        p={4}
      >
        <Flex alignItems="center" justifyContent="space-between" mb={4}>
          <Flex alignItems="center">
            <Flex
              alignItems="center"
              justifyContent="center"
              size={40}
              borderRadius={2}
              bg="primary.light"
              color="primary.main"
              mr={3}
            >
              {icon}
            </Flex>
            <Flex flexDirection="column">
              <Text typography="h4" bold>
                {description}
              </Text>
              <Text typography="body2" color="text.secondary">
                {event.code} • {formatISO(event.time)}
              </Text>
            </Flex>
          </Flex>
          <Button onClick={onClose}>Close</Button>
        </Flex>

        <Flex flexDirection="column" css={{ gap: 16 }}>
          <Flex>
            <Text typography="body2" bold width={120}>
              Session User:
            </Text>
            <Text typography="body2">{sessionUser}</Text>
          </Flex>

          <Flex>
            <Text typography="body2" bold width={120}>
              Database User:
            </Text>
            <Text typography="body2">{dbUser}</Text>
          </Flex>

          <Flex>
            <Text typography="body2" bold width={120}>
              Database:
            </Text>
            <Text typography="body2">{dbName}</Text>
          </Flex>

          <Flex>
            <Text typography="body2" bold width={120}>
              Service:
            </Text>
            <Text typography="body2">{dbService}</Text>
          </Flex>

          {query && query !== 'N/A' && (
            <Flex flexDirection="column">
              <Text typography="body2" bold mb={2}>
                Query:
              </Text>
              <Flex
                p={3}
                bg="spotBackground[1]"
                borderRadius={2}
                css={`
                  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                  font-size: 12px;
                  white-space: pre-wrap;
                  word-break: break-all;
                  max-height: 300px;
                  overflow-y: auto;
                `}
              >
                {query}
              </Flex>
            </Flex>
          )}

          <Flex flexDirection="column">
            <Text typography="body2" bold mb={2}>
              Raw Event Data:
            </Text>
            <Flex
              p={3}
              bg="spotBackground[1]"
              borderRadius={2}
              css={`
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 12px;
                white-space: pre-wrap;
                max-height: 200px;
                overflow-y: auto;
              `}
            >
              {JSON.stringify(raw, null, 2)}
            </Flex>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
}